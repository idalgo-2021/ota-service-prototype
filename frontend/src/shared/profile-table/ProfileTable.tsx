import type { ReactNode } from 'react';
import styles from './ProfileTable.module.css';

export const ProfileTable = ({ children }: { children: ReactNode }) => (
  <div className={styles.wrap}>
    <table className={styles.table}>{children}</table>
  </div>
);
