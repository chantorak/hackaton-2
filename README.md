# AWS Bedrock test script

Small helper to invoke AWS Bedrock from Node.js for quick testing.

Files
- `send_bedrock_test.js` - example script to call Bedrock's InvokeModel API.

Usage

1. Install dependencies:

   npm install

2. Dry run (no AWS network call):

   $env:DRY_RUN=1; node send_bedrock_test.js "Hello"

3. Real run (requires AWS credentials and proper Bedrock model access):

   $env:AWS_REGION="us-east-1"; node send_bedrock_test.js "Hello"

Environment
- `AWS_REGION` - AWS region (default: `us-east-1`)
- `BEDROCK_MODEL_ID` - optional model id to invoke (default: `anthropic.claude-v1` in the example)
- AWS credentials via environment variables or shared credentials/profile as usual for AWS SDK.

Notes
- This is a minimal example. The real Bedrock response body may be a stream. The script attempts to stringify it if supported.
- Replace `BEDROCK_MODEL_ID` with a model you have access to in your account/region.
