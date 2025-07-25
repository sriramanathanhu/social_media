#!/bin/bash
echo "🛡️  Activating data protection..."
/root/social_media/data-protection-system.sh pre_deployment_protection
if [ $? -eq 0 ]; then
    echo "✅ Pre-deployment protection activated"
else
    echo "❌ Pre-deployment protection failed - ABORTING DEPLOYMENT"
    exit 1
fi
