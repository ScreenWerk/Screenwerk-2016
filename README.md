# Screenwerk-2016
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/e70ffe1eb0fb4886bf329b613ed3f263)](https://www.codacy.com/app/mihkel-putrinsh/Screenwerk-2016?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=mitselek/Screenwerk-2016&amp;utm_campaign=Badge_Grade)

## Installation guide

### Windows
1. Download source from https://github.com/mitselek/Screenwerk-2016/archive/master.zip
2. Extract downloaded `master.zip` to desired destination and rename the folder to `Screenwerk`
3. Install `Git-****.exe` and `node-****.msi` from `installers` folder
4. Open CMD from the `Screenwerk` folder
5. Run `npm install` from the CMD window
  - Screenwerk will launch after downloading necessary packages where it asks SCREEN-ID. Enter correct screen-id and press ENTER
6. To start the Screenwerk, launch the `screenwerk.vbs` or run `npm start` command from the CMD in Screenwerk application folder
7. Close Screenwerk with `ALT + F4`

By default the Screenwerk starts on the second screen (if there are connected more than 1 screen to the PC). To change the start screen, you need to edit the file `./local/screen.yml`

### Windows (Statoil specific)

1. Download source:
  - If browser is allowed, then https://github.com/mitselek/Screenwerk-2016/archive/master.zip
  - If git already present, then `git clone https://github.com/mitselek/Screenwerk-2016.git`
2. Install Node and Git from `installers` folder
3. Run `npm install` from application folder
  - Screenwerk will launch and close with message telling you to set up the configuration. Location of configuration file - `./local/screen.yml` -  will be opened for you in explorer
4. Update the value for SCREEN_EID
6. Start the screenwerk with `npm start`


### Changelog

#### 0.3 new launch script for windows systems so that player starts even if git pull fails

#### 0.2 respect valid-from and valid-to properties of playlist-media and media
