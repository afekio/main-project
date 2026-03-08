# ☁️ AWS EC2 Provisioning & Nginx Deployment Tool 🚀

![Python Version](https://img.shields.io/badge/python-3.12.3-blue.svg)
![Pydantic Version](https://img.shields.io/badge/pydantic-2.12.5-e92063.svg)

## 📖 Overview
This is a straightforward provisioning tool designed to prepare a `.json` configuration file for deploying AWS EC2 instances. The tool guides the user through selecting instance parameters, rigorously validating each input, and logging the entire process. 

Upon successful validation and generation of the JSON configuration, the tool simulates a real-world cloud deployment. It utilizes a Python `subprocess` to automatically trigger an OS-specific Bash script that installs the Nginx package on the target machine based on the operating system chosen during the provisioning phase.

## ✨ Features
* **🖥️ Interactive Provisioning:** Guides users through EC2 configuration (Count, Name, OS, Instance Type).
* **🛡️ Strict Validation:** Ensures all user inputs meet the required criteria before proceeding.
* **📝 Comprehensive Logging:** Logs errors, warnings, and success messages to both the console and a dedicated log file.
* **⚙️ Automated JSON Generation:** Outputs a structured, AWS-ready JSON configuration file.
* **🐧 OS-Specific Deployment:** Automatically detects the chosen OS (Ubuntu or CentOS) and runs the corresponding Bash script to install Nginx.


## 🛠️ Getting Started

### Prerequisites
* Python 3.12.3 (or compatible 3.x version) installed on your machine.  [Download Python](https://www.python.org/downloads/)
* `pip` (Python package installer). - [Installing Pip](https://packaging.python.org/en/latest/tutorials/installing-packages/)

### 📦 Installation & Setup

**1. Clone the repository**
```bash
git clone https://github.com/afekio/main-project.git
cd main-project
```
## ⚠️ Warning: Do not change the names of any files or directories. The tool relies on this exact structure to function correctly.

**2. Create a Virtual Environment**
It is highly recommended to run this tool inside an isolated Python virtual environment.
```
python3 -m venv .venv
```
**3. Activate the Virtual Environment**

Windows:
```
.venv\Scripts\activate
```
macOS/Linux:
```
source .venv/bin/activate
```

(Note: You should now see (.venv) at the beginning of your CLI prompt, indicating the environment is active).

**4. Install Requirements**

Install the necessary Python dependencies using pip:
```
pip install -r requirements.txt
```

💻 Usage
Once everything is set up and no errors occurred during installation, you can launch the provisioning tool:
```
python3 main.py
```
Follow the on-screen prompts to input your desired instance configurations.
If you enter invalid data, the tool will notify you. You can check the logs for detailed information regarding any errors or successful executions.


## 🗂️ Project Structure

```
.
├── Configs/       # 📄 Stores the final generated output (reservation.json)
├── Logs/          # 📊 Accumulates all system and error logs (app.log)
├── Scripts/       # 📜 Contains the OS-specific Bash scripts for Nginx deployment
└── Src/           # 🗃️ Stores configuration and variable files (e.g., OS mappings)
```


## ⚠️ Important Notes
Data Overwrite: The Configs/reservation.json file is completely overwritten each time the tool is run. Make sure to back up previous configurations if you need to keep them.

Structural Integrity: Modifying, moving, or renaming the core directories (Configs, Logs, Scripts, Src) will cause the tool to fail.
