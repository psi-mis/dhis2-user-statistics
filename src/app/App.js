import React from 'react';
import HeaderBarComponent from 'd2-ui/lib/app-header/HeaderBar';
import headerBarStore$ from 'd2-ui/lib/app-header/headerBar.store';
import withStateFrom from 'd2-ui/lib/component-helpers/withStateFrom';
import LoadingMask from 'd2-ui/lib/loading-mask/LoadingMask.component';
import Snackbar from 'material-ui/Snackbar';
import FontIcon from 'material-ui/FontIcon';
import Paper from 'material-ui/Paper';
import Chip from 'material-ui/Chip';
import Avatar from 'material-ui/Avatar';
import { teal600, grey300, grey50, grey900 } from 'material-ui/styles/colors';

import AppTheme from '../theme';
import actions from '../actions';
import '../translationRegistration';

const HeaderBar = withStateFrom(headerBarStore$, HeaderBarComponent);

import Listing from './Listing.component.js';
import ListingInterpretation from './ListingInterpretation.component.js';
import Dashboard from './Dashboard.component.js';
import DashboardInterpretation from './DashboardInterpretation.component.js';
import HelpDialog from './HelpDialog.component';
const DASH_USERGROUPS_CODE = 'BATapp_ShowOnDashboard';
const help = {
  help: (
    <div>
      <p>
        This app provides a convenient interface to audit user accounts within your DHIS2 application.
      </p>
      <h1>Listing</h1>
      <p>
        Simple tool to list users with certain audit parameters to facilitate better user management.
      </p>
      <p>
        Features:
      </p>
      <ul style={{ listStyle: 'none' }}>
        <li>Listing users who have logged in the past X days</li>
        <li>Listing users who have not logged in the past X days</li>
      </ul>
      <h3>Note</h3>
      <p>Choosing to <i>Include Child OUs</i> may <b>dramatically</b> slow down your system depending on how high up in the tree you are searching.</p>
      <br/>
      <h1>
        Summary metrics on user status.
      </h1>
      <p>
        <b>Login Status By Group</b> will show user groups that have the <i>{DASH_USERGROUPS_CODE}</i> attribute assigned.
      </p>
      
      <p>
        Additional User Groups may be selected from the dropdown box.
      </p>
      <h3>Setup</h3>
      <ul>
          <li>Open the <b>Maintenance</b> app</li>
          <li>Find the <b>Attribute</b> section</li>
          <li>If it does not exist, create a new Attribute with <i>{DASH_USERGROUPS_CODE}</i> as the code. The name does not matter.</li>
          <li>Set the <b>Value type</b> to be <i>Yes/No</i></li>
          <li>Click the checkbox for <i>User group</i>, then Save</li>
          <li>Open the <b>Users</b> app and give particular user groups this attribute.</li>
      </ul>
      <h3>Notes</h3>
      <ul>
        <li>For this app to function as intended, Non-SuperUsers must have a role containing "View User Group Managing Relationships".</li>
        <li>For speed considerations the number of User Groups with the {DASH_USERGROUPS_CODE} attribute should be kept under 20 but may be more or less depending on the speed of your connection and DHIS2 server.</li>
      </ul>
    
    </div>
  ),
}


const style = {
  paper: {
    height: 65,
    margin: -20,
    width: '110%',
    textAlign: 'center',
    marginTop: 50
  },
  paperContent: {
    width: '95%',
    marginTop: 20,
    marginLeft: 10

  },
  titleSection: {
    fontSize: 20,
    paddingTop: 40,
    marginLeft: 10,
    fontWeight: 'bold'
  },
  chip: {
    margin: 4,
  },
  itemChips: {
    display: 'flex',
    flexWrap: 'wrap',
    padding: 5,
    justifySelf: 'stretch'

  },
  container: {
    display: 'grid',
    gridTemplateColumns: '20% auto 5% 8%',
    alignItems: 'start'
  },
  item: {
    padding:20,
    justifySelf: 'start',
    marginLeft: 10,
    fontWeight: 'bold'

  },
  itemHelp:{
    alignSelf: 'center'
  }

};

const sections = [
  { key: 'dUser', icon: 'insert_chart_outlined', label: 'app_dashboard_user_access' },
  { key: 'lUser', icon: 'view_list', label: 'app_listing_user_access' },
  { key: 'dInt', icon: 'insert_chart_outlined', label: 'app_dashboard_user_interpretation' },
  { key: 'LInt', icon: 'view_list', label: 'app_listing_user_interpretation' },
];

export default React.createClass({
  propTypes: {
    d2: React.PropTypes.object,
  },

  childContextTypes: {
    d2: React.PropTypes.object,
    muiTheme: React.PropTypes.object
  },

  getChildContext() {
    return {
      d2: this.props.d2,
      muiTheme: AppTheme
    };
  },

  getInitialState() {
    return {
      attrStore: {},
      groupStore: {},
      ouRoot: {},
      chipSelected: 'dUser'

    };

  },

  //attribute cache for sub component use
  async getAttributes() {
    const d2 = this.props.d2;
    const api = d2.Api.getApi();
    let attrs = {};
    try {
      let res = await api.get('/attributes?paging=false&fields=name,code,id');
      if (res.hasOwnProperty('attributes')) {
        for (let a of res.attributes) {
          attrs[a.id] = a.code;
        }
      }
    }
    catch (e) {
      console.error('Could not access Attributes from API');
    }
    return attrs;
  },

  //user group cache for sub component use
  async getUserGroups() {
    const d2 = this.props.d2;
    const api = d2.Api.getApi();
    let groups = {};
    try {
      let res = await api.get('/userGroups?fields=id,displayName,attributeValues,users&paging=false');
      if (res.hasOwnProperty('userGroups')) {
        for (let g of res.userGroups) {
          groups[g.id] = g;
        }
      }
    }
    catch (e) {
      console.error('Could not access userGroups from API');
    }
    return groups;
  },

  //get the top of the OU tree
  async getOuRoot() {
    const d2 = this.props.d2;
    const api = d2.Api.getApi();
    try {
      //get OU tree rootUnit
      let rootLevel = await d2.models.organisationUnits.list({ paging: false, level: 1, fields: 'id,path,displayName,children[id,path,displayName,children::isNotEmpty]' });
      if (rootLevel) {
        return rootLevel.toArray()[0];
      }
    }
    catch (e) {
      console.error('Could not access userGroups from API');
    }
    return undefined;
  },

  componentWillMount() {
    const d2 = this.props.d2;
    const api = d2.Api.getApi();

    let attribs = this.getAttributes();
    let groups = this.getUserGroups();
    let ouRoot = this.getOuRoot();
    attribs.then(res => {
      this.setState({ attrStore: res });
    });
    groups.then(res => {
      this.setState({ groupStore: res });
    });
    ouRoot.then(res => {
      this.setState({ ouRoot: res });
    });
  },

  componentDidMount() {
    this.subscriptions = [
      actions.showSnackbarMessage.subscribe(params => {
        if (!!this.state.snackbar) {
          this.setState({ snackbar: undefined });
          setTimeout(() => {
            this.setState({ snackbar: params.data });
          }, 150);
        } else {
          this.setState({ snackbar: params.data });
        }
      }),
    ];
  },

  componentWillUnmount() {
    this.subscriptions.forEach(subscription => {
      subscription.dispose();
    });
  },

  closeSnackbar() {
    this.setState({ snackbar: undefined });
  },

  showSnackbar(message) {
    this.setState({ snackbar: message });
  },

  setSection(key) {
    this.setState({ section: key });
  },

  renderSection(key, apps, showUpload) {
    if (Object.keys(this.state.groupStore).length === 0) {
      return (<LoadingMask />);
    }
    else {


      const d2 = this.props.d2;
      switch (key) {

        case "dUser":
          return (<Dashboard d2={d2} attribs={this.state.attrStore} groups={this.state.groupStore} ouRoot={this.state.ouRoot} />);
          break;

        case "lUser":
          return (<Listing d2={d2} groups={this.state.groupStore} ouRoot={this.state.ouRoot} />);
          break;

        case "dInt":
          return (<DashboardInterpretation d2={d2} attribs={this.state.attrStore} groups={this.state.groupStore} ouRoot={this.state.ouRoot} />);
          break;

        case "LInt":
          return (<ListingInterpretation d2={d2} groups={this.state.groupStore} ouRoot={this.state.ouRoot} />);
          break;

        //Default page
        default:
          return (<Dashboard d2={d2} attribs={this.state.attrStore} groups={this.state.groupStore} ouRoot={this.state.ouRoot} />);
      }
    }
  },
  handleClick(chipKey) {
    this.setState({ chipSelected: chipKey })
  },
  renderChip(data) {
    const d2 = this.props.d2;
    return (
      <Chip
        key={data.key}
        style={style.chip}
        onClick={(e) => this.handleClick(data.key)}
        backgroundColor={(this.state.chipSelected == data.key ? teal600 : grey300)}
        labelColor={(this.state.chipSelected == data.key ? grey50 : grey900)}
      >
        <Avatar backgroundColor={(this.state.chipSelected == data.key ? teal600 : grey300)} icon={<FontIcon className="material-icons">{data.icon}</FontIcon>} />
        {d2.i18n.getTranslation(data.label)}

      </Chip>
    );
  },

  render() {
    const d2 = this.props.d2;

    return (

      <div>
        <HeaderBar />
        <Paper style={style.paper} zDepth={2}>
       
          <div style={style.container}>
            <div style={style.item}>            
             {d2.i18n.getTranslation('app_name')}
            </div>
            <div style={style.itemChips}>
              {sections.map(this.renderChip, this)}
            </div>
            <div style={style.itemHelp}>
            <HelpDialog title={"App Help"} content={help.help} />
            </div>
          </div>
        </Paper>
        <div style={style.titleSection}>
            {d2.i18n.getTranslation(sections.filter(section => section.key == this.state.chipSelected)[0].label)}
          </div>
        <div style={style.paperContent}>
          {this.renderSection(this.state.chipSelected)}
        </div>

      </div>

    );
  },
});
