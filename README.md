# Screenwerk-2016
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/e70ffe1eb0fb4886bf329b613ed3f263)](https://www.codacy.com/app/mihkel-putrinsh/Screenwerk-2016?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=mitselek/Screenwerk-2016&amp;utm_campaign=Badge_Grade)

## Installation guide

### Windows
1. Download source from https://github.com/mitselek/Screenwerk-2016/archive/master.zip to dir c:\ScreenWerk
2. Install Node and Git from `installers` folder
3. Run `npm install` from application folder
  - Screenwerk will launch and close with message telling you to set up the configuration. Location of configuration file - `./local/screen.yml` -  will be opened for you in explorer
4. Update the value for SCREEN_EID
6. Start the screenwerk with `npm start`

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

#### 0.4 update electron to 1.4.7

#### 0.3 new launch script for windows systems so that player starts even if git pull fails

#### 0.2 respect valid-from and valid-to properties of playlist-media and media
