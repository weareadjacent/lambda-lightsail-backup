'use strict';

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

const lightsail = new AWS.Lightsail();

/**
 * List of target instances from environment variables.
 * @type {Array}
 */
const BACKUP_INSTANCES = process.env.BACKUP_INSTANCES.split(',');

const BACKUP_DAYS = 7;
const BACKUP_WEEKS = 4;
const BACKUP_MONTHS = 3;

/**
 * Convenience for calculating dates
 * @type {Date}
 */
const NOW = new Date();
const NOW_DATE_STRING = NOW.toDateString();
const ONE_DAY = 1000 * 60 * 60 * 24;

/**
 * Store backups chronologically, keyed by instance name.
 * @type {Object}
 */
let backups = {};


/**
 * Main handler from AWS lambda.
 */
exports.handler = (event, context, callback) => {
  (async function(){
    await loadBackups();

    for (let instance of BACKUP_INSTANCES) {
      if (!hasBackupToday(instance)) {
        createBackup(instance);
      }

      pruneBackups(instance);
    }
  })();
};

async function loadBackups() {
  // TODO handle paging
  let snapshots = (await lightsail.getInstanceSnapshots().promise()).instanceSnapshots;

  for (let snapshot of snapshots) {
    // Ignore snapshots not created via this script.
    if (!isBackupSnapshot(snapshot)) continue;

    let instance = snapshot.fromInstanceName;

    // Ignore other instances.
    if (!shouldBackupInstance(instance)) continue;

    // Create an array per instance.
    backups[instance] = backups[instance] || [];
    backups[instance].push(snapshot);
  }

  // Sort by date.
  for (let [instance, instanceBackups] of Object.entries(backups)) {
    instanceBackups.sort((a, b) => a.createdAt - b.createdAt);
  }
}

/**
 * Whether or not a snapshot was created by this script (looks at name).
 * @param  {Object}   snapshot Snapshot object
 * @return {Boolean}
 */
function isBackupSnapshot(snapshot) {
  return snapshot.name.endsWith('-autosnap');
}

function shouldBackupInstance(instance) {
  return BACKUP_INSTANCES.includes(instance);
}

function getLatestBackup(instance) {
  return backups[instance][backups[instance].length - 1];
}

function hasBackupToday(instance) {
  console.log(`${instance}: Checking for today's backup`);
  let latest = getLatestBackup(instance);
  return latest.createdAt.toDateString() === NOW_DATE_STRING;
}

function createBackup(instance) {
  console.log(`${instance}: Creating backup`);

  let date = new Date();
  let name = `${instance}-${date.getTime()}-autosnap`;
  let params = {
    instanceName: instance,
    instanceSnapshotName: name
  };

  lightsail.createInstanceSnapshot(params, function(err, data) {
    if (err) {
      console.error(`${instance}: Error creating snapshot`, err);
    } else {
      console.log(`${instance}: Snapshot created`, data);
    }
  });
}

function pruneBackups(instance) {
  console.log(`${instance}: Pruning backups`);

  for (let backup of backups[instance]) {
    let date = backup.createdAt;
    let dayOfWeek = date.getDay();
    let dayOfMonth = date.getDate();
    let age = Math.floor((NOW - date) / ONE_DAY);

    let saveBackup = false;

    if (age <= BACKUP_DAYS) {
      console.log(`${instance}: Retaining daily backup from ${backup.createdAt}`);
      saveBackup = true;
    } else if (age <= BACKUP_WEEKS * 7) {
      // Is sunday?
      if (dayOfWeek === 0) {
        console.log(`${instance}: Retaining weekly backup from ${backup.createdAt}`);
        saveBackup = true;
      }
    } else if (age <= BACKUP_MONTHS * 30) {
      if (
        dayOfMonth <= 7 && // Is first week of month?
        dayOfWeek === 0 // Is Sunday?
      ) {
        console.log(`${instance}: Retaining monthly backup from ${backup.createdAt}`);
        saveBackup = true;
      }
    }

    if (!saveBackup) {
      console.log(`${instance}: Deleting backup from ${backup.createdAt}`);
      deleteSnapshot(backup);
    }
  }
}

function deleteSnapshot(snapshot) {
  let params = {
    instanceSnapshotName: snapshot.name
  };

  lightsail.deleteInstanceSnapshot(params, function(err, data) {
    if (err) {
      console.error(`${snapshot.fromInstanceName}: Error deleting snapshot ${snapshot.name}`, err);
    } else {
      console.log(`${snapshot.fromInstanceName}: Snapshot ${snapshot.name} deleted`);
    }
  });
}