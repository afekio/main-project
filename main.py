import json
import logging
import logging.handlers
from datetime import datetime
from typing import List
from pydantic import BaseModel, ValidationError

# --- Configuration ---
LOG_FILE_PATH = "./Logs/app.log"
CONFIG_FILE_PATH = "./Configs/reservation.json"
OS_DATA_PATH = "./Src/os_ids.json"

# --- Logging Setup ---
logger = logging.getLogger("CloudTool")
logger.setLevel(logging.INFO)

# 'a' mode appends to the log file
file_handler = logging.handlers.RotatingFileHandler(
    LOG_FILE_PATH, maxBytes=1024*1024, backupCount=1, mode='a'
)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# --- Pydantic Models ---
class TagModel(BaseModel):
    Key: str
    Value: str

class InstanceModel(BaseModel):
    ImageId: str
    InstanceType: str
    LaunchTime: str
    Tags: List[TagModel]

class ReservationModel(BaseModel):
    Instances: List[InstanceModel]

class RootModel(BaseModel):
    Reservations: List[ReservationModel]

# --- Main Logic ---
def main():
    print("--- Start Provisioning ---")

    # 1. Load OS Data
    try:
        with open(OS_DATA_PATH, 'r') as f:
            os_data = json.load(f)
    except FileNotFoundError:
        # LOG LEVEL: ERROR (Missing file)
        msg = f"Critical Error: The source file {OS_DATA_PATH} was not found."
        logger.error(msg)
        print("Error: Source file missing. Check logs.")
        return
    except json.JSONDecodeError:
        # LOG LEVEL: ERROR (Corrupt file)
        msg = f"Critical Error: The file {OS_DATA_PATH} contains invalid JSON."
        logger.error(msg)
        print("Error: Source file is corrupt. Check logs.")
        return

    # --- User Input Section ---

    # 2. Input: Machine Count (1-10)
    count = 0
    while True:
        val = input("Enter count (1-10): ")
        if val.isdigit():
            int_val = int(val)
            if 1 <= int_val <= 10:
                count = int_val
                break
        
        # LOG LEVEL: ERROR (User Input Error)
        logger.error(f"Invalid count input: '{val}'. Must be between 1 and 10.")
        print("Error: Please enter a number between 1 and 10.")

    # 3. Input: Machine Name
    base_name = ""
    while True:
        val = input("Enter machine base name: ")
        if len(val.strip()) > 0:
            base_name = val
            break
        
        # LOG LEVEL: ERROR (User Input Error)
        logger.error("Invalid name input: Empty string provided.")
        print("Error: Name cannot be empty.")

    # 4. Input: OS Selection
    os_key = ""
    while True:
        val = input("Enter OS (ubuntu/centos): ").lower()
        if val in ["ubuntu", "centos"]:
            os_key = val
            break
        
        # LOG LEVEL: ERROR (User Input Error)
        logger.error(f"Invalid OS input: '{val}'. Must be ubuntu or centos.")
        print("Error: Must be 'ubuntu' or 'centos'.")

    # 5. Input: Machine Type
    type_choice = ""
    print("1. T2micro (VCPU- 2, RAM- 1GB)\n2. T2nano (VCPU- 1, RAM- 0.5GB)")
    while True:
        val = input("Select type (1 or 2): ")
        if val in ["1", "2"]:
            type_choice = val
            break
        
        # LOG LEVEL: ERROR (User Input Error)
        logger.error(f"Invalid type input: '{val}'. Must be 1 or 2.")
        print("Error: Must be 1 or 2.")

    # --- Processing & Output ---

    try:
        # Prepare Data
        ami = os_data.get(os_key, "ami-unknown")
        i_type = "t2.micro" if type_choice == "1" else "t2.nano"
        launch_time = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

        instances_list = []

        # Generate Instances
        for i in range(1, count + 1):
            name_val = f"{base_name}-{i}"
            
            instance = InstanceModel(
                ImageId=ami,
                InstanceType=i_type,
                LaunchTime=launch_time,
                Tags=[
                    TagModel(Key="Name", Value=name_val)
                ]
            )
            instances_list.append(instance)

        # Build Final Structure
        # Root -> Reservations (List) -> Item -> Instances (List)
        reservation = ReservationModel(Instances=instances_list)
        final_output = RootModel(Reservations=[reservation])

        # Write to JSON
        with open(CONFIG_FILE_PATH, 'w') as f:
            f.write(final_output.model_dump_json(indent=4))

        # LOG LEVEL: INFO (Success)
        success_msg = f"Successfully created configuration for {count} instances in {CONFIG_FILE_PATH}"
        logger.info(success_msg)
        print(f"Success! Configuration saved. \nCreated configuration for {count} instances in {CONFIG_FILE_PATH}. \nYou can check the logs for details in Logs/app.log.")

    except ValidationError as e:
        # LOG LEVEL: ERROR (Code/Data structure failure)
        logger.error(f"Internal Validation Error: {e}")
        print("System Error: Data validation failed.")
    except Exception as e:
        # LOG LEVEL: ERROR (Unexpected crash)
        logger.error(f"Unexpected System Error: {e}")
        print("An unexpected error occurred.")

if __name__ == "__main__":
    main()