const { app } = require('electron');
try {
    console.log('Electron version:', process.versions.electron);
    console.log('App path:', app.getAppPath());
    process.exit(0);
} catch (e) {
    console.error(e);
    process.exit(1);
}
