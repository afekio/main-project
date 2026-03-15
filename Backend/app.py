import os
import time
import subprocess
from flask import Flask, request, jsonify
from pydantic import ValidationError

# Import existing logic from your modules
from Src.logger import setup_loggers
from Src.defs import load_os_data, generate_reservation_model, save_configuration

app = Flask(__name__)
f_logger, c_logger = setup_loggers()

def run_bash_installation(os_key: str) -> bool:
    """Runs the installation script and logs output in real-time."""
    script_path = os.path.join("./Scripts/", f"{os_key}_install.sh")
    
    if not os.path.exists(script_path):
        f_logger.error(f"Script not found: {script_path}")
        return False

    f_logger.info(f"--- Starting deployment: {script_path} ---")

    try:
        # Using Popen to read the output in real-time
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
    data = request.get_json()
    
    # Extract data from React payload
    count = int(data.get('count', 1))
    base_name = data.get('baseName', '')
    os_key = data.get('osKey', '')
    type_choice = data.get('typeChoice', '')
    install_script = data.get('installScript', 'none') # Default to none

    os_data = load_os_data(f_logger, c_logger)
    if not os_data:
        return jsonify({"error": "Failed to load OS data"}), 500

    try:
        # Generate Pydantic model
        final_model = generate_reservation_model(count, base_name, os_key, type_choice, os_data)
    except ValidationError as e:
        f_logger.error(f"Validation Error: {e}")
        return jsonify({"error": "Data validation failed"}), 400

    # 1. Save JSON to Configs directory
    save_configuration(final_model, f_logger, c_logger, count)
    
    # 2. Check if we need to run a subprocess or skip it
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
    # Run the Flask server
    app.run(host='0.0.0.0', port=5000)