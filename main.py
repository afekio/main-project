from pydantic import ValidationError

from Src.logger import setup_loggers
from Src.defs import (
    load_os_data,
    get_user_inputs,
    generate_reservation_model,
    save_configuration,
    run_bash_installation
)

def main():
    f_logger, c_logger = setup_loggers()
    
    try:
        f_logger.info("--- Tool Execution Started ---")
        c_logger.info("--- Start Provisioning ---")
        print("Tool to provision EC2 instances with Nginx installation. Please follow the prompts below.\n")
        print("All actions and errors will be logged to ./Logs/app.log for your reference.\n")
        print("Let's get started!\n")

        os_data = load_os_data(f_logger, c_logger)
        if os_data is None:
            return

        count, base_name, os_key, type_choice = get_user_inputs(f_logger, c_logger)

        try:
            final_model = generate_reservation_model(count, base_name, os_key, type_choice, os_data)
        except ValidationError as e:
            f_logger.error(f"Internal Validation Error!!!: {e}")
            c_logger.error("System Error: Data validation failed!!!.")
            return

        save_configuration(final_model, f_logger, c_logger, count)
        
        # Check if the installation was successful
        deployment_success = run_bash_installation(os_key, f_logger, c_logger)
        
        if deployment_success:
            f_logger.info("--- Tool Execution Completed Successfully ---")
            c_logger.info("\nFinished Provisioning!")
        else:
            f_logger.error("--- Tool Execution Terminated Deployment Failure ---")
            c_logger.error("\nProcess stopped. Deployment issues were Stopped.")

    except KeyboardInterrupt:
        f_logger.error("Execution interrupted by the user (Control+C).")
        c_logger.error("\n\nProcess was stopped by the user.")
        
    except Exception as e:
        f_logger.critical(f"Unexpected system crash: {e}")
        c_logger.error("\nAn unexpected error occurred.")

if __name__ == "__main__":
    main()