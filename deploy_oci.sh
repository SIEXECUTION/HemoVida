#!/usr/bin/env bash
# ==============================================================================
# Script de aprovisionamiento y despliegue para Oracle Cloud Infrastructure (OCI)
# Sistema operativo recomendado: Ubuntu 22.04 / 24.04 LTS
# ==============================================================================
set -e

echo ">>> [1/4] Actualizando repositorios del sistema..."
sudo apt-get update -y

echo ">>> [2/4] Instalando Docker y utilidades necesarias..."
sudo apt-get install -y ca-certificates curl gnupg iptables-persistent

if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

echo ">>> [3/4] Abriendo puerto 8000 en el firewall local de Oracle Linux/Ubuntu..."
# Oracle Cloud VMs tienen reglas estrictas de iptables preinstaladas
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT || sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

echo ">>> [4/4] Construyendo e iniciando contenedor del Backend..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "NOTA: Se creó el archivo .env a partir de .env.example."
    echo "Recuerda editar .env con tu DATABASE_URL de Supabase: nano .env"
fi

sudo docker compose up -d --build

echo "=============================================================================="
echo " [OK] Backend HemoVida desplegado exitosamente en el puerto 8000!"
echo " Puedes verificar el estado con: sudo docker compose ps"
echo " Puedes ver los logs con: sudo docker compose logs -f"
echo "=============================================================================="
