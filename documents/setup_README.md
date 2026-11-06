# Fullstack + GridFS base project template by Boima
This is a prebuilt project template setup applied for techstack below, help speed up the setup stage, feel free to clone this repo and follow "Detail guide on using this prebuilt template" section


## Techstack use in this project:
- Frontend: React Vite
- Backend: Nodejs Express
- Database: MongoDB & MongoDB GridFS


<hr>
<br><br>

## Detail guide on using this prebuilt template
### I. Setting up frontend
1. After cloning this repo, setup frontend by cd into frontend folder, install the dependencies for frontend
```cmd
cd frontend\Template_GridFS
npm install 
```

2. Setup the frontend `.env` file, you can copy the `.env.example` file and rename it to `.env` file as example
<br><br>


### II. Setting backend
1. Start at the root directory, cd into backend folder, install the dependencies for backend
```cmd
cd backend 
npm install
```

2. Setup the backend `.env` file, you can copy the `.env.example` file and rename it to `.env` file as example, REPLACE YOUR MONGO_URI THERE
<br><br>


### III. Turning this template project into your own project
1. Change the project name, you can change the following from Template_GridFS to "yourNewProjectName"
- root folder name 
- go into react/, change the react folder name to "yourNewProjectName"
- go into react/"yourNewProjectName", modify `package.json` and `package-lock.json` the "Template_GridFS" to "yourNewProjectName" BUT LOWERCASE

2. Remove git by deleting the `.git` folder, then this project no longer a Git repo. You can run 'git init' to initialize this project into your own git repo. You can also delete this `README.md` too.
<br><br>


Done. Refer to `runCommand.md` to run Frontend and Backend.

