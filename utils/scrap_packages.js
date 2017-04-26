'use strict';
const fs = require('fs');
const scrapper = require('npm-user-pkgs-scrapper');

scrapper('danielo515').then( packages =>{

    packages.forEach((pkg) => {
        fs.writeFileSync(`pages/projects/npm/${pkg.name}.json`,JSON.stringify(pkg,null,2))
    });
})
.then( () => console.log('DONE!'));