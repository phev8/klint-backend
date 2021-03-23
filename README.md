# Welcome to Klint-Backend!

Klint-Backend serves as the data persistency layer for Klint. Data is held in memory and will periodically be saved to the disk. 

# Setup with debug certificate

    npm install
		openssl req -nodes -new -x509 -keyout server.key -out server.cert

# Launch

    npm start
Will automatically recompile and relaunch if source code is edited. By default only https is available on port 4242.

# API Examples
 - Project Data (Entity: Project)
	- GET /projects
		- Returns a list of KeyValuePairs ({key: primaryKey, value: Project}) containing all Projects entities with StatusCode OK (200).
	- GET /projects/0
		- Get Project entity with primary key 0 (could be any string).
		- Returns a KeyValuePair containing the Project entity with primary key 0, if it exists, otherwise returns with StatusCode.NotFound(404)
	- PUT /projects/0
		- Set the Project entity with the primary key 0. Expects a Project entity in JSON in the request body.
		- Returns with StatusCode OK (200) if the Project entity is valid and has been replaced. Otherwise returns with StatusCode BadRequest (400).
	- DELETE /projects/0
		- Delete the Project entity with primary key 0 and all MarkingData entities recorded for it.
		- Returns with StatusCode OK (200), if the entity has been deleted. If the entity doesn't exist, Status Code NotFound (404) is returned.
- Marking Data (Entity: MarkingData)
	- GET /markings/0/
		- Get marking data for the Project with the primary key 0
		- Returns a list of KeyValuePairs containing the MarkingsData elements for the Project with primary key 0 with StatusCode OK (200).
	- GET /markings/0/42
		- Get marking data for the Image or VideoFrame with the primary key 42 inside of the Project with primary key 0.
		- Returns a KeyValuePair if the MarkingData entity exists, otherwise returns with StatusCode NotFound (404).
		- MarkingData entities are supposed to exists if and only if the respective VideoFrame or Image has markings.
	- PUT /markings/0/42
		- Set the MarkingData entity for the Image / VideoFrame with key 42 inside of the Project with the primary key 0. Expects a MarkingData entity in JSON in the request body.
		- Returns with StatusCode OK (200) if the MarkingData entity is valid and has been replaced. Otherwise returns with StatusCode BadRequest (400).
	- DELETE /markings/0/42
		- Delete the MarkingsData entity for the Image / VideoFrame with key 42 inside of the Project with the primary key 0.
		- Returns with StatusCode OK (200), if the entity has been deleted. If the entity doesn't exist, Status Code NotFound (404) is returned.

# Limitations
Keys must not include the pipe character '|', as it is used as a delimiter for compound keys.
