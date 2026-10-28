#!/usr/bin/env bash

ENV_FILE=".env"
EXAMPLE_FILE=".env.example"

# 1. Si le fichier .env n'existe pas, on le duplique depuis l'exemple
if [ ! -f "$ENV_FILE" ] && [ -f "$EXAMPLE_FILE" ]; then
    cp "$EXAMPLE_FILE" "$ENV_FILE"
    echo "📄 Fichier .env créé à partir de .env.example"
elif [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
fi

# 2. Détection automatique de l'adresse IP locale de l'hôte
DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$DETECTED_IP" ]; then
    DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
fi
if [ -z "$DETECTED_IP" ]; then
    DETECTED_IP="127.0.0.1"
fi

echo "🔍 IP détectée : $DETECTED_IP"

# 3. Fonction pour ajouter ou mettre à jour une clé dans le .env
update_env_var() {
    local key="$1"
    local value="$2"
    
    if grep -q "^${key}=" "$ENV_FILE"; then
        # La clé existe déjà, on remplace sa valeur (compatible macOS et Linux)
        sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
    else
        # La clé n'existe pas, on l'ajoute à la fin
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

# 4. Application des mises à jour
update_env_var "HOST_IP" "$DETECTED_IP"
update_env_var "EXPO_PUBLIC_API_URL" "http://${DETECTED_IP}:8000/api/v1"

echo "✨ Fichier .env mis à jour avec succès (HOST_IP=$DETECTED_IP)."
