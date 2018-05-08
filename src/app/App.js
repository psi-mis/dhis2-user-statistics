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

import AppTheme from '../colortheme';
import actions from '../actions';
import '../translationRegistration';

const HeaderBar = withStateFrom(headerBarStore$, HeaderBarComponent);

import Listing from './Listing.component.js';
import ListingInterpretation from './ListingInterpretation.component.js';
import Dashboard from './Dashboard.component.js';
import DashboardInterpretation from './DashboardInterpretation.component.js';

const style = {
  paper: {
    height: 65,
    margin: -20,
    width: '130%',
    textAlign: 'center',
    marginTop: 50
  },
  paperContent: {
    height: '80%',
    width: '80%',
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
    gridTemplateColumns: '25% auto',
    alignItems: 'end'
  },
  item: {
    padding: 20,
    justifySelf: 'start'
  }
};

const sections = [
  { key: 'dUser', icon: 'dashboard', label: 'app_dashboard_user_access' },
  { key: 'lUser', icon: 'listing', label: 'app_listing_user_access' },
  { key: 'dInt', icon: 'dashboard', label: 'app_dashboard_user_interpretation' },
  { key: 'LInt', icon: 'listing', label: 'app_listing_user_interpretation' },
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
      let rootLevel = await d2.models.organisationUnits.list({ paging: false, level: 1, fields: 'id,displayName,children::isNotEmpty' });
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
          </div>
        </Paper>
        <div style={style.titleSection}>
            {d2.i18n.getTranslation(sections.filter(section => section.key == this.state.chipSelected)[0].label)}
          </div>
        <Paper style={style.paperContent} zDepth={1}>
          {this.renderSection(this.state.chipSelected)}
        </Paper>

      </div>

    );
  },
});
