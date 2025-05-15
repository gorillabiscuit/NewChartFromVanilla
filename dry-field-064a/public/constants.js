export const BASE_REPULSION = 0.008;
export const REPULSION_POWER = 0.5;
export const REPULSION_CLUSTER_CAP = 6;
export const OUTWARD_FORCE = 0.004;
export const OUTWARD_FORCE_DIVISOR = 3;
export const OUTWARD_FORCE_POWER = 0.5;
export const OUTWARD_CLUSTER_CAP = 6;
export const SPRING_CONSTANT = 0.008;
export const CLUSTER_SCALE_DIVISOR = 3;
export const OVERLAP_SCALE = 0.3;
export const OVERLAP_FORCE_MULTIPLIER = 3;
export const BASE_VELOCITY = 0.2;
export const VELOCITY_POWER = 0.9;
export const MAX_FRAMES = 60;
export const REVERT_DELAY = 2000;
export const REVERT_SPEED = 0.15;
export const BASE_DAMPING = 0.75;
export const EXTRA_DAMPING = 0.15;
export const DAMPING_CLUSTER_THRESHOLD = 6;

// Layout Constants
export const CHART_HEIGHT_RATIO = 0.88; // Reduce plot area to leave space for x-axis labels
export const CHART_PADDING_X = 24; // 24px left padding for y-axis
export const CHART_PADDING_TOP_RATIO = 0.03; // 3% top padding
export const CHART_PADDING_BOTTOM_RATIO = 0.09; // 9% bottom padding for x-axis labels

// Tick Constants
export const TICK_LENGTH = 5; // Length of axis tick marks
export const TICK_PADDING = 5; // Padding between tick and label
export const DATE_TICK_COUNT = 12; // Number of date ticks to show

// Data Padding Constants
export const MIN_PADDING_PERCENT = 0.05;  // Minimum 5% padding
export const MAX_PADDING_PERCENT = 0.1;   // Maximum 10% padding
export const BUBBLE_PADDING_FACTOR = 1.2; // Add 20% extra space for bubble radius

// Axis and Tick Constants
export const DATE_FORMAT = { month: 'short', day: 'numeric' };
export const GRID_LINE_COLOR = '#ddd';
export const AXIS_LINE_COLOR = '#666';

// Protocol Colors
export const PROTOCOL_COLORS = {
    'NFTfi': '#D14D8A',
    'Gondi': '#FFE082',
    'X2Y2': '#D1A06F',
    'Zharta': '#5EC6A6',
    'Arcade': '#5B8DB8',
    'Metastreet': '#A3C8F5',
    'Blend': '#B18CFF'
};
export const DEFAULT_PROTOCOL_COLOR = '#888888';

// Wallet Addresses
export const WALLETS = [
    "0xd79b937791724e47f193f67162b92cdfbf7abdfd",
    "0x1da5331994e781ab0e2af9f85bfce2037a514170",
    "0x6358869f958ecdd132f5da7937264de46e54483c",
    "0xcffc336e6d019c1af58257a0b10bf2146a3f42a4",
    "0xd876f7215aaa80272b52eccdbf30e949eec13292",
    "0x94de7e2c73529ebf3206aa3459e699fbcdfcd49b",
    "0x7a65cd0ad11e7329f534b5b65113997cf75e3546",
]; 