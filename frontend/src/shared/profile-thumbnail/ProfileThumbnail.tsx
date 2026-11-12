import { Box, Image } from '@chakra-ui/react';
import Link from 'next/link';
import styles from './ProfileThumbnail.module.css';

type ProfileThumbnailProps = {
  href: string;
  label: string;
  src?: string | null;
};

export const ProfileThumbnail = ({ href, label, src }: ProfileThumbnailProps) => (
  <Link href={href} className={styles.link} aria-label={label}>
    {src ? (
      <Image src={src} alt="" className={styles.image} />
    ) : (
      <Box className={styles.placeholder} />
    )}
  </Link>
);
