import type { SystemStyleObject } from '@chakra-ui/react';
import type { CSSProperties } from 'react';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import Text from 'ol/style/Text.js';
import { colors } from '@/shared/colors';
import { mapColors, POINT_KINDS } from '../constants';

export const rootStyle = { position: 'relative', h: '100%' } satisfies SystemStyleObject;

export const cssVariables = {
  '--map-primary': colors.primary,
  '--map-primary-soft': `${colors.primary}18`,
  '--map-surface': colors.white,
  '--map-text': colors.text,
  '--map-border': colors.borderLight,
  '--map-shadow': mapColors.shadow,
  '--map-district-label': mapColors.districtLabel,
  '--map-district-label-bg': mapColors.districtLabelBg,
  '--map-district-label-border': mapColors.districtLabelBorder,
  '--map-office': POINT_KINDS.office.color,
  '--map-music': POINT_KINDS.music.color,
  '--map-station': POINT_KINDS.station.color,
} as CSSProperties;

export const mapContainerStyle: CSSProperties = { height: '100%', width: '100%' };

export const getDistrictStyle = (selected: boolean, name: string) =>
  new Style({
    stroke: new Stroke({ color: mapColors.district, width: 2, lineDash: [2, 6], lineCap: 'round' }),
    fill: new Fill({ color: selected ? 'rgba(108, 159, 235, 0.13)' : 'rgba(108, 159, 235, 0.02)' }),
    text: selected
      ? new Text({
          text: name,
          font: '11px sans-serif',
          fill: new Fill({ color: mapColors.districtLabel }),
          backgroundFill: new Fill({ color: mapColors.districtLabelBg }),
          padding: [6, 8, 6, 8],
        })
      : undefined,
  });

export const areaStyle = new Style({
  stroke: new Stroke({ color: colors.primary, width: 2 }),
  fill: new Fill({ color: `${colors.primary}14` }),
});

export const nearbyRadiusStyle = new Style({
  stroke: new Stroke({ color: 'rgba(16, 23, 34, 0.24)', width: 2 }),
  fill: new Fill({ color: 'rgba(16, 23, 34, 0.10)' }),
});

export const nearbyRadiusLabelStyle = new Style({
  text: new Text({
    text: 'около 1 км',
    font: '700 12px Arial, sans-serif',
    fill: new Fill({ color: '#101722' }),
    backgroundFill: new Fill({ color: 'rgba(255, 255, 255, 0.88)' }),
    padding: [6, 9, 6, 9],
    offsetY: -4,
  }),
});

export const tileErrorStyle = {
  position: 'absolute',
  zIndex: 1,
  top: 'calc(118px + env(safe-area-inset-top, 0px))',
  left: 'calc(12px + env(safe-area-inset-left, 0px))',
  right: 'calc(68px + env(safe-area-inset-right, 0px))',
  p: '10px',
  bg: colors.white,
  borderRadius: '8px',
  fontSize: '12px',
} satisfies SystemStyleObject;
