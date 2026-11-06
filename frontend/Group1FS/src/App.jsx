import styles from "./App.module.css";
import Co_gridFS_Upload from "./pages/GridFS_Upload.jsx";
import Co_gridFS_List from "./pages/GridFS_List.jsx";
import Co_gridFS_Download from "./pages/GridFS_Download.jsx";
import Co_gridFS_Rename from "./pages/GridFS_Rename.jsx";
import Co_gridFS_Delete from "./pages/GridFS_Delete.jsx";

function App() {
    return (
        <div className={styles.main_App}>
            <h1>React welcome page</h1>
            
            <Co_gridFS_Upload />
            <Co_gridFS_List />
            <Co_gridFS_Download />
            <Co_gridFS_Rename />
            <Co_gridFS_Delete />
        </div>
    );
}

export default App;