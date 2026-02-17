
# Simulating Infrastructure Provisioning
# Accepting User Input & Validation
# • The tool should allow users to define machines dynamically.
# • Input should be validated to ensure correctness.
# • Store configurations in a JSON file (configs/instances.json).
# • Use a library like  pydantic for validation.
# Task:
# • Create a function to prompt users for input.
# • Implement validation to reject invalid inputs.
# • Store the collected data in instances.json.
# Hint: Think about what fields a VM requires (e.g., name, OS, CPU, RAM) and ensure
# users enter valid values.
# i want to create option for the user to choose the OS from a predefined list (e.g., Ubuntu, CentOS) and validate the input accordingly.
# also i want the user to choose the CPU and RAM from a predefined range (e.g., CPU: 1-4 cores, RAM: 1-4 GB) and validate the input accordingly.
# the user need to choose name for the machine validate that the name is not empty and have to be str and not any other type.
# the user can choose number of machines to create and validate that the number is a positive integer.
# Dont use @validator from pydantic use custom validation functions instead.
# the user need to set only name, amount of machines, os, cpu and ram for all the machines and the tool will create the same configuration for all the machines.
# i want it to validate the input for any option the user choose, if the user choose invalid input it should show error msg and ask for the input again until the user provides valid input.
# the user set amount of machines but the tool will create the same configuration for all the machines, so the user need to set only one configuration and the tool will replicate it for the number of machines specified.

import json
from pydantic import BaseModel, ValidationError
from typing import List
class VMConfig(BaseModel):
    name: str
    os: str
    cpu: int
    ram: int

    def validate_name(self):
        if not self.name or not isinstance(self.name, str):
            raise ValueError('Name must be a non-empty string')

    def validate_os(self):
        valid_os = ['Ubuntu', 'CentOS']
        if self.os not in valid_os:
            raise ValueError(f'OS must be one of {valid_os}')

    def validate_cpu(self):
        if not (1 <= self.cpu <= 4):
            raise ValueError('CPU must be between 1 and 4 cores')

    def validate_ram(self):
        if not (1 <= self.ram <= 4):
            raise ValueError('RAM must be between 1 and 4 GB')

def get_user_input() -> List[VMConfig]:
    vm_configs = []
    while True:
        try:
            num_machines = int(input("Enter the number of machines to create: "))
            if num_machines <= 0:
                raise ValueError("Number of machines must be a positive integer")
            break
        except ValueError as e:
            print(f"Invalid input: {e}. Please try again.")
    for _ in range(num_machines):
        while True:
            name = input("Enter machine name: ")
            if not name or not isinstance(name, str):
                print("Invalid input: Name must be a non-empty string. Please try again.")
            else:
                break
        while True:
            os = input("Choose OS (Ubuntu/CentOS): ")
            if os not in ['Ubuntu', 'CentOS']:
                print("Invalid input: OS must be one of ['Ubuntu', 'CentOS']. Please try again.")
            else:
                break
        while True:
            try:
                cpu = int(input("Enter CPU cores (1-4): "))
                if not (1 <= cpu <= 4):
                    raise ValueError("CPU must be between 1 and 4 cores")
                break
            except ValueError as e:
                print(f"Invalid input: {e}. Please try again.")
        while True:
            try:
                ram = int(input("Enter RAM in GB (1-4): "))
                if not (1 <= ram <= 4):
                    raise ValueError("RAM must be between 1 and 4 GB")
                break
            except ValueError as e:
                print(f"Invalid input: {e}. Please try again.")
        try:
            vm_config = VMConfig(name=name, os=os, cpu=cpu, ram=ram)
            vm_configs.append(vm_config)
        except ValidationError as e:
            print(f"Validation error: {e}")
    return vm_configs


def save_configs_to_json(vm_configs: List[VMConfig]):
    with open('configs/instances.json', 'w') as f:
        json.dump([vm.dict() for vm in vm_configs], f, indent=4)
        
if __name__ == "__main__":
    vm_configs = get_user_input()
    save_configs_to_json(vm_configs)
    print("Configurations saved to configs/instances.json")
    
