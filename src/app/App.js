import React from 'react';
import HeaderBarComponent from 'd2-ui/lib/app-header/HeaderBar';
import headerBarStore$ from 'd2-ui/lib/app-header/headerBar.store';
import withStateFrom from 'd2-ui/lib/component-helpers/withStateFrom';
import Sidebar from 'd2-ui/lib/sidebar/Sidebar.component';

import Snackbar from 'material-ui/lib/snackbar';
import FontIcon from 'material-ui/lib/font-icon';

import AppTheme from '../colortheme';
import actions from '../actions';
import '../translationRegistration';
let injectTapEventPlugin = require("react-tap-event-plugin");
injectTapEventPlugin();

const HeaderBar = withStateFrom(headerBarStore$, HeaderBarComponent);

import Listing  from './Listing.component.js';
import Dashboard  from './Dashboard.component.js';
//import Usage    from './Usage.component.js';
//import Activity from './Activity.component.js';
//
// import installSqlViews from './sqlViews';
// import SqlInstaller from '../sqlviewinstaller/Install.component.js';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

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
        ouRoot:{},
      };
    },

    //attribute cache for sub component use
    async getAttributes() {
      const d2 =this.props.d2;
      const api = d2.Api.getApi();
      let attrs = {};
      try{
        let res = await api.get('/attributes?paging=false&fields=name,code,id');
        if (res.hasOwnProperty('attributes')){
          for (let a of res.attributes){
            attrs[a.id]=a.code;
          }
        }
      }
      catch(e){
        console.error('Could not access Attributes from API');
      }
      return attrs;
    },

    //user group cache for sub component use
    async getUserGroups() {
      const d2 =this.props.d2;
      const api = d2.Api.getApi();
      let groups = {};
      try{
        let res = await api.get('/userGroups?fields=id,displayName,attributeValues&paging=false');
        if (res.hasOwnProperty('userGroups')){
          for (let g of res.userGroups){
            groups[g.id]=g;
          }
        }
      }
      catch(e){
        console.error('Could not access userGroups from API');
      }
      return groups;
    },

    //get the top of the OU tree
    async getOuRoot() {
      const d2 = this.props.d2;
      const api = d2.Api.getApi();
      try{
        //get OU tree rootUnit
        let rootLevel = await d2.models.organisationUnits.list({ paging: false, level: 1, fields: 'id,displayName,children::isNotEmpty' });
        if (rootLevel){
            return rootLevel.toArray()[0];
        }
      }
      catch(e){
        console.error('Could not access userGroups from API');
      }
      return undefined;
    },

    componentWillMount(){
      const d2 = this.props.d2;
      const api = d2.Api.getApi();

      let attribs = this.getAttributes();
      let groups = this.getUserGroups();
      let ouRoot = this.getOuRoot();
      attribs.then(res=>{
        this.setState({attrStore:res});
      });
      groups.then(res=>{
        this.setState({groupStore:res});
      });
      ouRoot.then(res=>{
        this.setState({ouRoot:res});
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
      const d2 = this.props.d2;
      switch (key) {
        // case "activity":
        //   return (<Activity d2={d2} />);
        //   break;
        //
        // case "usage":
        //   return (<Usage d2={d2} />);
        //   break;

        case "dashboard":
          return (<Dashboard d2={d2} attribs={this.state.attrStore} groups={this.state.groupStore}  ouRoot={this.state.ouRoot} />);
          break;

        case "listing":
          return (<Listing d2={d2} groups={this.state.groupStore} ouRoot={this.state.ouRoot}  />);
          break;

        // case "sqlinstaller":
        //   return (<SqlInstaller d2={d2} views={installSqlViews} />);
        //   break;

        //Default page
        default:
          return (<Dashboard d2={d2} attribs={this.state.attrStore} groups={this.state.groupStore}  ouRoot={this.state.ouRoot} />);
      }
    },

    render() {
      const d2 = this.props.d2;
      const sections = [
//          { key: 'dashboard', icon:'dashboard',         label:d2.i18n.getTranslation('app_dashboard'), },
//          { key: 'listing', icon:'people_outline',      label:d2.i18n.getTranslation('app_listing'), },
//          { key: 'sqlinstaller', icon:'settings_applications', label:'Installer', },
//          { key: 'activity',icon:'person_pin',        label:d2.i18n.getTranslation('app_activity'), },
//          { key: 'usage',   icon:'track_changes',     label:d2.i18n.getTranslation('app_usage'), },
      ].map(section => ({
          key: section.key,
          label: section.label,
          icon: <FontIcon className="material-icons">{section.icon}</FontIcon>,
      }));

      return (
          <div className="app-wrapper">
           <h1 className="appheader">{d2.i18n.getTranslation('app_name')}</h1>
           <HeaderBar />
            <div className="separator"></div>
              <Tabs>
                <TabList>
                  <Tab><FontIcon className="material-icons">dashboard</FontIcon> {d2.i18n.getTranslation('app_dashboard')}</Tab>
                  <Tab><FontIcon className="material-icons">listing</FontIcon>{d2.i18n.getTranslation('app_listing')}</Tab>
                  
                </TabList>
                <TabPanel>
                    {this.renderSection('dashboard')}                
                </TabPanel>
                <TabPanel>
                  {this.renderSection('listing')}
                </TabPanel>
               
              </Tabs>
          </div>
          
          
      );
    },
});
