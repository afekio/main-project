import os
import time
import subprocess
import html
import re
import json
from functools import wraps
from flask import Flask, request, jsonify
from pydantic import ValidationError
import jwt
import datetime

# Import DB and Models 
from Src.db import db, User, DeploymentHistory

# Import existing logic from your modules
from Src.logger import setup_loggers
from Src.defs import load_os_data, generate_reservation_model, save_configuration

app = Flask(__name__)
f_logger, c_logger = setup_loggers()

# Database and Security configurations
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://admin:securepassword123@db:5432/provision_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-super-secret-jwt-key' 

db.init_app(app)

from sqlalchemy.exc import OperationalError

# Create tables with a retry mechanism for Docker readiness
with app.app_context():
    retries = 5
    while retries > 0:
        try:
            db.create_all()
            print("Database connected and tables verified.")
            break
        except OperationalError:
            print(f"Database not ready yet. Retrying in 3 seconds... ({retries} attempts left)")
            retries -= 1
            time.sleep(3)
            
    if retries == 0:
        print("CRITICAL: Could not connect to the database after multiple retries. Exiting.")
        exit(1)

# --- Authentication Middleware ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'error': 'User not found!'}), 401
        except Exception as e:
            return jsonify({'error': 'Token is invalid or expired!'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated


# --- Authentication Routes ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    required_fields = ['username', 'password', 're_password', 'email', 'fullName']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Missing field: {field}'}), 400
            
    if data['password'] != data['re_password']:
        return jsonify({'error': 'Passwords do not match'}), 400
        
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400

    new_user = User(username=data['username'], email=data['email'], full_name=data['fullName'])
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    # Log successful user creation
    f_logger.info(f"Action: REGISTER | Status: SUCCESS | User: {new_user.username} created successfully.")
    return jsonify({'message': 'User registered successfully'}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing credentials'}), 400
        
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.check_password(data['password']):
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        # Log successful login
        f_logger.info(f"Action: LOGIN | Status: SUCCESS | User: {user.username} logged in successfully.")
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {'username': user.username, 'fullName': user.full_name, 'email': user.email}
        }), 200
        
    # Log failed login attempt (fixed indentation)
    f_logger.warning(f"Action: LOGIN | Status: FAILED | Attempted Username: {data.get('username')}")
    return jsonify({'error': 'Invalid username or password'}), 401


# --- User Profile & Personal Area Routes ---
@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Returns user details and their file history"""
    deployments = DeploymentHistory.query.filter_by(user_id=current_user.id).order_by(DeploymentHistory.created_at.desc()).all()
    return jsonify({
        'username': current_user.username,
        'fullName': current_user.full_name,
        'email': current_user.email,
        'files': [d.to_dict() for d in deployments]
    }), 200


@app.route('/api/user/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.get_json()
    old_password = data.get('oldPassword')
    new_password = data.get('newPassword')
    
    if not old_password or not new_password:
        return jsonify({'error': 'Missing required fields'}), 400
        
    if not current_user.check_password(old_password):
        return jsonify({'error': 'Incorrect current password'}), 400
        
    current_user.set_password(new_password)
    db.session.commit()
    
    # Log password reset
    f_logger.info(f"Action: PASSWORD_RESET | Status: SUCCESS | User: {current_user.username} reset their password.")
    return jsonify({'message': 'Password updated successfully'}), 200


@app.route('/api/user/file/<int:file_id>', methods=['GET'])
@token_required
def get_user_file(current_user, file_id):
    deployment = DeploymentHistory.query.filter_by(id=file_id, user_id=current_user.id).first()
    
    if not deployment:
        return jsonify({'error': 'File not found or unauthorized access'}), 404
        
    # Identify if the user viewed or downloaded the file using a query parameter
    action = request.args.get('action', 'view')
    
    if action == 'download':
        f_logger.info(f"Action: FILE_DOWNLOAD | Status: SUCCESS | User: {current_user.username} downloaded file: {deployment.file_name}")
    else:
        f_logger.info(f"Action: FILE_VIEW | Status: SUCCESS | User: {current_user.username} viewed file: {deployment.file_name}")
        
    return jsonify({
        'fileName': deployment.file_name,
        'fileType': deployment.file_type,
        'content': deployment.file_content
    }), 200


# --- Provisioning Logic ---
def is_malicious_payload(input_string):
    malicious_pattern = re.compile(r'(<|>|<script>|javascript:|onload=|eval\()', re.IGNORECASE)
    return bool(malicious_pattern.search(str(input_string)))

def sanitize_and_validate_payload(data):
    errors = []
    clean_data = {}

    allowed_keys = {'count', 'baseName', 'osKey', 'typeChoice', 'installScript', 'infraType'}
    incoming_keys = set(data.keys())
    extra_keys = incoming_keys - allowed_keys
    
    if extra_keys:
        f_logger.critical(f"SECURITY ALERT: Unexpected fields in payload: {', '.join(extra_keys)}. Raw payload: {data}")
        errors.append("Security Error: Payload contains unauthorized or unrecognized fields.")
        return None, errors 

    raw_count = data.get('count')
    if raw_count is None:
        errors.append("Validation Error: 'count' is missing.")
    else:
        try:
            count = int(raw_count)
            if 1 <= count <= 10:
                clean_data['count'] = count
            else:
                errors.append("Validation Error: 'count' must be between 1 and 10.")
        except (ValueError, TypeError):
            errors.append("Validation Error: 'count' must be a valid number.")

    allowed_os = ['ubuntu', 'centos']
    raw_os = data.get('osKey')
    if raw_os is None:
        errors.append("Validation Error: 'osKey' is missing.")
    else:
        raw_os_str = str(raw_os).strip()
        if is_malicious_payload(raw_os_str):
            errors.append("Security Error: Invalid characters in OS selection.")
        elif raw_os_str in allowed_os:
            clean_data['osKey'] = raw_os_str
        else:
            errors.append(f"Validation Error: 'osKey' must be strictly one of {allowed_os}.")

    allowed_types = ['1', '2']
    raw_type = data.get('typeChoice')
    if raw_type is None:
        errors.append("Validation Error: 'typeChoice' is missing.")
    else:
        raw_type_str = str(raw_type).strip()
        if is_malicious_payload(raw_type_str):
            errors.append("Security Error: Invalid characters in Type selection.")
        elif raw_type_str in allowed_types:
            clean_data['typeChoice'] = raw_type_str
        else:
            errors.append(f"Validation Error: 'typeChoice' must be strictly one of {allowed_types}.")

    allowed_scripts = ['none', 'nginx']
    raw_script = data.get('installScript')
    if raw_script is None:
        clean_data['installScript'] = 'none' 
    else:
        raw_script_str = str(raw_script).strip()
        if not raw_script_str:
            clean_data['installScript'] = 'none'
        elif is_malicious_payload(raw_script_str):
            errors.append("Security Error: Invalid characters in Script selection.")
        elif raw_script_str in allowed_scripts:
            clean_data['installScript'] = raw_script_str
        else:
            errors.append(f"Validation Error: 'installScript' must be strictly one of {allowed_scripts}.")

    raw_base_name = data.get('baseName')
    if raw_base_name is None:
        errors.append("Validation Error: 'baseName' is missing.")
    else:
        raw_base_name_str = str(raw_base_name).strip()
        if is_malicious_payload(raw_base_name_str):
            errors.append("Security Error: Invalid characters in Base Name.")
        elif not raw_base_name_str:
            errors.append("Validation Error: Base Name is required.")
        else:
            clean_data['baseName'] = html.escape(raw_base_name_str)

    allowed_infra = ['json', 'terraform']
    raw_infra = data.get('infraType')
    
    if raw_infra is None:
        clean_data['infraType'] = 'json'
    else:
        raw_infra_str = str(raw_infra).strip()
        if is_malicious_payload(raw_infra_str):
            errors.append("Security Error: Invalid characters in Infrastructure Type.")
        elif raw_infra_str in allowed_infra:
            clean_data['infraType'] = raw_infra_str
        else:
            errors.append(f"Validation Error: 'infraType' must be strictly one of {allowed_infra}.")

    return clean_data, errors

def run_bash_installation(os_key: str) -> bool:
    script_path = os.path.join("./Scripts/", f"{os_key}_install.sh")
    if not os.path.exists(script_path):
        f_logger.error(f"Script not found: {script_path}")
        return False

    try:
        process = subprocess.Popen(
            ["bash", script_path], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1 
        )
        for line in process.stdout:
            clean_line = line.strip()
            if clean_line:
                f_logger.info(f"[Bash]: {clean_line}")
        process.wait()
        return process.returncode == 0
    except Exception as e:
        f_logger.critical(f"Critical System Error running bash script: {e}")
        return False

@app.route('/api/provision', methods=['POST'])
@token_required
def provision(current_user):
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
        
    raw_data = request.get_json()
    clean_data, validation_errors = sanitize_and_validate_payload(raw_data)
    
    if validation_errors:
        return jsonify({"error": "Payload validation failed", "details": validation_errors}), 400

    count = clean_data.get('count')
    base_name = clean_data.get('baseName')
    os_key = clean_data.get('osKey')
    type_choice = clean_data.get('typeChoice')
    install_script = clean_data.get('installScript')
    infra_type = clean_data.get('infraType')

    os_data = load_os_data(f_logger, c_logger)
    if not os_data:
        return jsonify({"error": "Failed to load OS data"}), 500

    try:
        final_model = generate_reservation_model(count, base_name, os_key, type_choice, os_data)
    except ValidationError as e:
        return jsonify({"error": "Data validation failed at model generation"}), 400

    response_payload = None
    save_success = False

    if infra_type == 'terraform':
        from Src.tf_generator import generate_tf_file
        save_success, tf_content = generate_tf_file(final_model, f_logger, count, base_name, os_key)
        if save_success:
            response_payload = tf_content 
    else:
        try:
            save_configuration(final_model, f_logger, c_logger, count)
            save_success = True
            response_payload = final_model.model_dump() 
        except Exception as e:
            save_success = False

    if not save_success:
         return jsonify({"error": "Failed to generate infrastructure configuration file"}), 500

    # --- SAVE TO USER HISTORY (DATABASE) ---
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    extension = 'tf' if infra_type == 'terraform' else 'json'
    db_file_name = f"{base_name}_{timestamp}.{extension}"
    
    content_to_save = response_payload if isinstance(response_payload, str) else json.dumps(response_payload, indent=2)
    
    new_deployment = DeploymentHistory(
        user_id=current_user.id,
        file_name=db_file_name,
        file_type=infra_type,
        file_content=content_to_save
    )
    db.session.add(new_deployment)
    db.session.commit()
    # ---------------------------------------

    if install_script != 'none':
        deployment_success = run_bash_installation(os_key)
        if not deployment_success:
            return jsonify({"error": "Deployment failed. Check app.log"}), 500
    
    return jsonify({
        "message": "Success", 
        "config": response_payload 
    }), 200


@app.route('/api/log_error', methods=['POST'])
def log_frontend_error():
    error_data = request.get_json()
    f_logger.error(f"[Frontend Validation Error]: {error_data}")
    return jsonify({"status": "logged"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)