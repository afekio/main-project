# ☁️ Cloud Instance Configuration Generator

![Python Version](https://img.shields.io/badge/python-3.9%2B-blue?style=flat&logo=python)
![Pydantic](https://img.shields.io/badge/Pydantic-v2.0-e92063?style=flat&logo=pydantic)
![Status](https://img.shields.io/badge/status-stable-green?style=flat)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

> **Final Project Submission** > A robust CLI tool designed to generate standardized cloud instance configurations with strict validation and comprehensive logging.

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage](#-usage)
- [Output Example](#-output-example)
- [Technologies Used](#-technologies-used)
- [Author](#-author)

---

## 🧐 Overview

This tool allows system administrators and DevOps engineers to quickly generate JSON configuration files for cloud instances. Instead of manually writing JSON files (which is error-prone), users interact with a friendly Command Line Interface (CLI).

The system ensures data integrity using **Pydantic** for validation—preventing invalid configurations like negative RAM values or unsupported Operating Systems—and tracks all operations via a built-in **Logging** system.

---

## ✨ Key Features

* **Interactive CLI:** User-friendly prompts to collect instance details (Name, Count, OS, RAM, CPUs).
* **Robust Validation:** Powered by **Pydantic** models to ensure type safety and logical constraints (e.g., ensuring RAM is a positive integer).
* **Audit Logging:** Automatically records user inputs, validation successes/failures, and file generation events to a `.log` file.
* **JSON Export:** Generates a clean, formatted `.json` file ready for deployment pipelines.
* **Error Handling:** Graceful error management with clear feedback for the user.

---

## 📂 Project Structure

```text
├── config_generator/     # Source code
│   ├── __init__.py
│   ├── main.py           # Entry point
│   ├── models.py         # Pydantic data schemas
│   ├── logger.py         # Logging configuration
│   └── utils.py          # Helper functions (file I/O)
├── logs/                 # Generated log files
├── output/               # Generated JSON files
├── requirements.txt      # Python dependencies
└── README.md             # Project documentation