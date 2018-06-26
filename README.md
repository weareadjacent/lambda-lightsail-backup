# Lambda Lightsail Backup

A node script (runnable on AWS Lambda) to manage incremental snapshots of AWS Lightsail instances.

Inspired by/based on [vidanov/lambda-nodejs-lightsail-backup](https://github.com/vidanov/lambda-nodejs-lightsail-backup).

## Setup

### Step 1. Create the IAM policy

 1. As root, sign into the [AWS console](https://aws.amazon.com).
 1. Go to the [IAM page](https://console.aws.amazon.com/iam/).
 1. Click **Policies**, and then **Create Policy**.
 1. Go to the **JSON** tab. Paste in the following:
    
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "Stmt1510233220000",
                    "Effect": "Allow",
                    "Action": [
                        "lightsail:CreateInstanceSnapshot",
                        "lightsail:DeleteInstanceSnapshot",
                        "lightsail:GetInstanceSnapshot",
                        "lightsail:GetInstanceSnapshots"
                    ],
                    "Resource": [
                        "*"
                    ]
                }
            ]
        }

 1. Click **Review Policy**.
 1. Give it the name **`LightsailSnapshots`**, a description if desired, and click **Create Policy**.

### Step 2. Create the IAM role

1. Click **Roles** in the IAM menu, then **Create Role**.
1. Under the **AWS Service** tab, click **Lambda** in the services list.
1. Click **Next: Permissions**.
1. In the search field, type **`AWSLambdaBasicExecutionRole`** and check the box for it.
1. Also in the search field, type **`LightsailSnapshots`** and check the box for it too.
1. Click **Next: Review**.
1. Give the role name **`LightsailSnapshotsRole`** click **Create Role**.

### Step 3. Create Lambda function

 1. Go to the [Lambda Dashboard](https://console.aws.amazon.com/lambda/home).
 1. Click **Create Function**.
 1. from the preselected **Author From Scratch** tab:
    - Set the name to **`lightsail-backups`**.
    - Set the runtime to **Node.js 8.10**.
    - Select the existing role **`LightsailSnapshotsRole`** you created in the step 2.
 1. Click **Create Function**.
 1. In the design panel, click **Add triggers**, then **CloudWatch Event**.
 1. In the **Rule** section, click **Create a new rule**.
 1. Name the rule **`NightlyBackup`**
 1. In **Schedule expression**, enter `cron(0 7 * * ? *)` and click **Add**.
 1. In the designer box, click on **lightsail-backups** again and paste everything from [src/index.js](src/index.js).
 1. Find the line in the code about region, and customize it for the region you're working in (TODO: allow this to work across more than one region).
 2. You can also customize how many daily, weekly and monthly backups to keep. You should have at least 7 daily backups for this to work properly.
 1. Under **Environment variables**, add a variable called **`BACKUP_INSTANCES`**, with the value being a comma-separated list of instances names you'd like to back up. E.g.:

        host1,host2,host3
 
 1. Under **Basic settings**, set **Timeout** to 1 minute.
 1. Click **Save** at the top right of the page.

### Step 4. Test the function

 1. Click **Configure test events** in the dropdown left of the **Test** button at the top of the page. Use preselected values.
 2. Set the name to **`test`** and click **Create**.
 3. Click the **Test** button.