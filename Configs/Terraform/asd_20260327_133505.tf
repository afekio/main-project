# Auto-generated Terraform Config for asd
# Generated on: 20260327_133505
# OS: Centos
# Instances Count: 2

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

resource "proxmox_vm_qemu" "asd_nodes" {
  count       = 2
  name        = "asd-${count.index + 1}"
  target_node = "pve"
  clone       = "centos-template"
  
  os_type = "cloud-init"
  cores   = 2
  sockets = 1
  memory  = 2048

  network {
    model  = "virtio"
    bridge = "vmbr0"
  }
}
