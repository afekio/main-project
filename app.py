import os
import time
import subprocess
import html
import re
from flask import Flask, request, jsonify
from pydantic import ValidationError

# Import existing logic from your modules
from Src.logger import setup_loggers
from Src.defs import load_os_data, generate_reservation_model, save_configuration

app = Flask(__name__)
f_logger, c_logger = setup_loggers()

def is_malicious_payload(input_string):
    """Detects common injection characters and patterns."""
    malicious_pattern = re.compile(r'(<|>|<script>|javascript:|onload=|eval\()', re.IGNORECASE)
    return bool(malicious_pattern.search(str(input_string)))

def sanitize_and_validate_payload(data):
    """Strictly validates payload structure, types, and specific allowed values."""
    errors = []
    clean_data = {}

    # --- 0. Block Unknown Fields (Mass Assignment Protection) ---
    allowed_keys = {'count', 'baseName', 'osKey', 'typeChoice', 'installScript'}
    incoming_keys = set(data.keys())
    extra_keys = incoming_keys - allowed_keys
    
    if extra_keys:
        error_msg = f"Unexpected fields in payload: {', '.join(extra_keys)}"
        f_logger.critical(f"SECURITY ALERT: {error_msg}. Raw payload: {data}")
        errors.append("Security Error: Payload contains unauthorized or unrecognized fields.")
        return None, errors # Stop validation immediately if unauthorized fields exist

    # --- 1. Validate 'count' (Must be 1 to 10) ---
    raw_count = data.get('count')
    if raw_count is None:
        errors.append("Validation Error: 'count' is missing.")
    else:
        try:
            count = int(raw_count)
            if 1 <= count <= 10:
                clean_data['count'] = count
            else:
                f_logger.error(f"Validation Error: 'count' out of bounds. Input: {raw_count}")
                errors.append("Validation Error: 'count' must be between 1 and 10.")
        except (ValueError, TypeError):
            f_logger.error(f"Validation Error: 'count' invalid type. Input: {raw_count}")
            errors.append("Validation Error: 'count' must be a valid number.")

    # --- 2. Validate 'osKey' (Strictly 'ubuntu' or 'centos') ---
    allowed_os = ['ubuntu', 'centos']
    raw_os = data.get('osKey')
    if raw_os is None:
        errors.append("Validation Error: 'osKey' is missing.")
    else:
        raw_os_str = str(raw_os).strip()
        if is_malicious_payload(raw_os_str):
            f_logger.critical(f"SECURITY ALERT: Malicious payload in 'osKey': {raw_os_str}")
            errors.append("Security Error: Invalid characters in OS selection.")
        elif raw_os_str in allowed_os:
            clean_data['osKey'] = raw_os_str
        else:
            f_logger.error(f"Validation Error: 'osKey' must be {allowed_os}. Input: '{raw_os_str}'")
            errors.append(f"Validation Error: 'osKey' must be strictly one of {allowed_os}.")

    # --- 3. Validate 'typeChoice' (Strictly '1' or '2') ---
    allowed_types = ['1', '2']
    raw_type = data.get('typeChoice')
    if raw_type is None:
        errors.append("Validation Error: 'typeChoice' is missing.")
    else:
        raw_type_str = str(raw_type).strip()
        if is_malicious_payload(raw_type_str):
            f_logger.critical(f"SECURITY ALERT: Malicious payload in 'typeChoice': {raw_type_str}")
            errors.append("Security Error: Invalid characters in Type selection.")
        elif raw_type_str in allowed_types:
            clean_data['typeChoice'] = raw_type_str
        else:
            f_logger.error(f"Validation Error: 'typeChoice' must be {allowed_types}. Input: '{raw_type_str}'")
            errors.append(f"Validation Error: 'typeChoice' must be strictly one of {allowed_types}.")

    # --- 4. Validate 'installScript' (Strictly 'none' or 'nginx') ---
    allowed_scripts = ['none', 'nginx']
    raw_script = data.get('installScript')
    if raw_script is None:
        clean_data['installScript'] = 'none' # Safe default if completely missing
    else:
        raw_script_str = str(raw_script).strip()
        if not raw_script_str:
            clean_data['installScript'] = 'none'
        elif is_malicious_payload(raw_script_str):
            f_logger.critical(f"SECURITY ALERT: Malicious payload in 'installScript': {raw_script_str}")
            errors.append("Security Error: Invalid characters in Script selection.")
        elif raw_script_str in allowed_scripts:
            clean_data['installScript'] = raw_script_str
        else:
            f_logger.error(f"Validation Error: 'installScript' must be {allowed_scripts}. Input: '{raw_script_str}'")
            errors.append(f"Validation Error: 'installScript' must be strictly one of {allowed_scripts}.")

    # --- 5. Validate 'baseName' (Free text, requires sanitization) ---
    raw_base_name = data.get('baseName')
    if raw_base_name is None:
        errors.append("Validation Error: 'baseName' is missing.")
    else:
        raw_base_name_str = str(raw_base_name).strip()
        if is_malicious_payload(raw_base_name_str):
            f_logger.critical(f"SECURITY ALERT: Malicious payload in 'baseName': {raw_base_name_str}")
            errors.append("Security Error: Invalid characters in Base Name.")
        elif not raw_base_name_str:
            f_logger.error("Validation Error: 'baseName' was empty.")
            errors.append("Validation Error: Base Name is required.")
        else:
            clean_data['baseName'] = html.escape(raw_base_name_str)

    return clean_data, errors

def run_bash_installation(os_key: str) -> bool:
    """Runs the installation script and logs output in real-time."""
    script_path = os.path.join("./Scripts/", f"{os_key}_install.sh")
    
    if not os.path.exists(script_path):
        f_logger.error(f"Script not found: {script_path}")
        return False

    f_logger.info(f"--- Starting deployment: {script_path} ---")

    try:
        process = subprocess.Popen(
            ["bash", script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1 
        )
        
        for line in process.stdout:
            clean_line = line.strip()
            if clean_line:
                f_logger.info(f"[Bash]: {clean_line}")

        process.wait()
        
        if process.returncode == 0:
            f_logger.info("Deployment executed successfully.")
            return True
        else:
            f_logger.error(f"Deployment failed! Exit code: {process.returncode}")
            return False

    except Exception as e:
        f_logger.critical(f"Critical System Error running bash script: {e}")
        return False

@app.route('/api/provision', methods=['POST'])
def provision():
    f_logger.info("Received new provision request from UI.")
    
    if not request.is_json:
        f_logger.error("Request received without JSON payload.")
        return jsonify({"error": "Request must be JSON"}), 400
        
    raw_data = request.get_json()
    
    # 1. Security & Validation Layer
    clean_data, validation_errors = sanitize_and_validate_payload(raw_data)
    
    if validation_errors:
        return jsonify({
            "error": "Payload validation failed",
            "details": validation_errors
        }), 400

    # Extract SAFE data
    count = clean_data.get('count')
    base_name = clean_data.get('baseName')
    os_key = clean_data.get('osKey')
    type_choice = clean_data.get('typeChoice')
    install_script = clean_data.get('installScript')

    # 2. Business Logic Layer
    os_data = load_os_data(f_logger, c_logger)
    if not os_data:
        return jsonify({"error": "Failed to load OS data"}), 500

    try:
        final_model = generate_reservation_model(count, base_name, os_key, type_choice, os_data)
    except ValidationError as e:
        f_logger.error(f"Pydantic Validation Error: {e}")
        return jsonify({"error": "Data validation failed at model generation"}), 400

    save_configuration(final_model, f_logger, c_logger, count)
    
    if install_script == 'none':
        f_logger.info("No post-launch script selected. Skipping subprocess execution.")
        deployment_success = True
    else:
        f_logger.info(f"Executing post-launch script for: {install_script}")
        deployment_success = run_bash_installation(os_key)
    
    if deployment_success:
        return jsonify({
            "message": "Success", 
            "config": final_model.model_dump()
        }), 200
    else:
        return jsonify({"error": "Deployment failed. Check app.log"}), 500

@app.route('/api/log_error', methods=['POST'])
def log_frontend_error():
    """Receives validation errors from React and logs them."""
    error_data = request.get_json()
    f_logger.error(f"[Frontend Validation Error]: {error_data}")
    return jsonify({"status": "logged"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)