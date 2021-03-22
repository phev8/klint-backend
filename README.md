# Welcome to Klint-Backend!

Klint-Backend serves as the data persistency layer for Klint.

# Setup

    npm install

# Launch

    npm start
Will automatically recompile and relaunch if source code is edited. By default only https is available on port 4242.

# API Examples
 - Get all Projects
	 - GET /projects
 - Get Project with Key 0 (could be any string)
	 - GET /projects/0
 - Get all Annotations (MarkingData) in Project 0
	 - GET /markings/0/
 - Get MarkingData (Annotations) for Image/VideoFrame with key 42 in Project 0
	 - GET /markings/0/42
 - Respective PUT / DELETE shall be available

# Limitations
Keys must not include the pipe character '|', as it is used as a delimiter for compound keys.
