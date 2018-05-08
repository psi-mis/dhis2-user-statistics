
import{

    lightBlue200,
    lightBlue400,
    lightBlue600,
    deepPurple300,
    grey100,
    grey500,
    darkBlack,
    white,
    grey300,
    grey900,
    cyan800
} from 'material-ui/styles/colors';
import { fade } from 'material-ui/utils/colorManipulator';
import Spacing from 'material-ui/styles/spacing';
import zIndex from 'material-ui/styles/zIndex';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

const theme = {
    spacing: Spacing,
    zIndex: zIndex,
    fontFamily: 'Roboto, sans-serif',
    palette: {
        primary1Color: lightBlue200,
        primary2Color: lightBlue400,
        primary3Color: lightBlue600,
        accent1Color: deepPurple300,
        accent2Color: grey100,
        accent3Color: grey500,
        textColor: darkBlack,
        alternateTextColor: white,
        canvasColor: white,
        borderColor: grey300,
        disabledColor: fade(grey900, 0.3),
        pickerHeaderColor: cyan800,

    }
};


function createAppTheme(style) {
    return {
        sideBar: {
            backgroundColor: '#F3F3F3',
            backgroundColorItem: 'transparent',
            backgroundColorItemActive: style.palette.accent2Color,
            textColor: style.palette.textColor,
            textColorActive: style.palette.primary1Color,
            borderStyle: '1px solid #e1e1e1',
        },
        forms: {
            minWidth: 350,
            maxWidth: 900,
        },
    };
}

const muiTheme = getMuiTheme(theme);
const appTheme = createAppTheme(theme);

export default Object.assign({}, muiTheme, appTheme);
