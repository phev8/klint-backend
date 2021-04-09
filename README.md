# Welcome to Klint-Backend!

Klint-Backend serves as the data persistency layer for Klint. Data is held in memory and will be periodically saved to the disk. 
Documentation is here: https://www.postman.com/joint-operations-administrator-17375884/workspace/klint/overview

# Setup with debug certificate

    npm install
    openssl req -nodes -new -x509 -keyout server.key -out server.cert

# Launch

    npm start
Will automatically recompile and relaunch if source code is edited. By default only https is available on port 4242.


# Limitations
Keys must not include the pipe character '|', as it is used as a delimiter for compound keys.
