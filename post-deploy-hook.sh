#!/bin/bash
echo "🔍 Verifying deployment data integrity..."
/root/social_media/data-protection-system.sh post_deployment_verification
if [ $? -eq 0 ]; then
    echo "✅ Deployment verification successful"
else
    echo "❌ Deployment verification failed - initiating rollback"
    /root/social_media/data-protection-system.sh emergency_restore pre_deployment
    exit 1
fi
