'use strict';

exports.handler = (event, context, callback) => {
    console.log(process.env.BACKUP_INSTANCES);
    const BACKUP_INSTANCES = process.env.BACKUP_INSTANCES.split(',');
    console.log(BACKUP_INSTANCES);
    
    const AWS = require('aws-sdk');
    AWS.config.update({ region: 'us-east-1' });
    console.log(AWS.config);

    const lightsail = new AWS.Lightsail();
};