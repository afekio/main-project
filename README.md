# ☁️ AWS EC2 Provisioning & Nginx Deployment Tool 🚀

![Python Version](https://img.shields.io/badge/python-3.12.3-blue.svg)
![Pydantic Version](https://img.shields.io/badge/pydantic-2.12.5-e92063.svg)

## 📖 Overview
What this tool does:
This tool makes AWS EC2 deployment simple. It helps you generate a validated .json configuration file through an easy step-by-step process.

Once your config is ready, the tool triggers a Python subprocess to run a Bash script. This automatically installs Nginx on your instance, tailored specifically to the

## 🛠️ Getting Started

### Prerequisites
* Python 3.12.3 (or compatible 3.x version) installed on your machine.  [Download Python](https://www.python.org/downloads/)
* `pip` (Python package installer). - [Installing Pip](https://packaging.python.org/en/latest/tutorials/installing-packages/)
* pip ubuntu/debian
```
sudo apt update ; sudo apt install python3-pip -y
```
* pip for centos/rocky
```
sudo yum update -y
sudo yum install epel-release -y
sudo yum install python-pip -y
```
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
