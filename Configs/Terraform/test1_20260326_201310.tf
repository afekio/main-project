# Auto-generated Terraform Config for test1
# Generated on: 20260326_201310
# OS: Ubuntu
# Instances Count: 10

terraform {
  required_providers {
    proxmox = {
      source  = "telmate/proxmox"
      version = "2.9.14"
    }
  }
}

provider "proxmox" {
  pm_api_url = "https://your-proxmox-server:8006/api2/json"
}

resource "proxmox_vm_qemu" "test1_nodes" {
  count       = 10
  name        = "test1-${count.index + 1}"
  target_node = "pve"
  clone       = "ubuntu-template"
  
  os_type = "cloud-init"
  cores   = 2
  sockets = 1
  memory  = 2048

  network {
    model  = "virtio"
    bridge = "vmbr0"
  }
}
