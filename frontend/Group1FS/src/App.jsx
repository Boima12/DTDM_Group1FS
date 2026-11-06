import styles from "./App.module.css";
import Co_sidebar from '../sidebar.jsx';
import Co_mainContainer from '../mainContainer.jsx';

function App() {
    return (
        <div className={styles.main_App}>
            <Co_sidebar />

            <Co_mainContainer />
        </div>
    );
}

export default App;