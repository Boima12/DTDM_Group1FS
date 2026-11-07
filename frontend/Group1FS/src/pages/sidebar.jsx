import {
    Cloud,
    FilePlus2,
    Folder,
    HardDrive,
    Trash2,
} from 'lucide-react';
import styles from './sidebar.module.css';

function Co_sidebar({ onUploadClick }) {

    return(
        <aside className={styles.sidebar}>
            <div className={styles.brand}>
                <span className={styles.brandIcon}><Cloud size={20} /></span>
                <span>Group1FS</span>
            </div>

            <button type="button" 
                className={styles.uploadButton}
                onClick={onUploadClick}
            >
                <FilePlus2 size={17} />
                <span>Tải tệp lên</span>
            </button>

            <nav className={styles.navigation} aria-label="Điều hướng chính">
                <a className={`${styles.navItem} ${styles.active}`} href="#my-drive">
                    <Folder size={18} />
                    <span>My Drive</span>
                    <span className={styles.count}>24</span>
                </a>
                <a className={styles.navItem} href="#trash">
                    <Trash2 size={18} />
                    <span>Thùng rác</span>
                    <span className={`${styles.count} ${styles.trashCount}`}>3</span>
                </a>
            </nav>

            <div className={styles.storage}>
                <div className={styles.storageHeader}>
                    <span><HardDrive size={14} /> Dung lượng lưu trữ</span>
                    <strong>28%</strong>
                </div>
                <div className={styles.progressTrack}>
                    <span />
                </div>
                <div className={styles.storageFooter}>
                    <span>1.4 GB / 5.0 GB</span>
                    <span>GridFS</span>
                </div>
            </div>
        </aside>
    );
}

export default Co_sidebar