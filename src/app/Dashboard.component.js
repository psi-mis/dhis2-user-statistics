import React from 'react';

import { getInstance } from 'd2/lib/d2';

import Paper from 'material-ui/lib/paper';
import Snackbar from 'material-ui/lib/snackbar';
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/lib/table';
import CircularProgress from 'material-ui/lib/circular-progress';
import RaisedButton from 'material-ui/lib/raised-button';
import FontIcon from 'material-ui/lib/font-icon';

import { green300,lime300, lightGreen300, yellow300, orange300, deepOrange300, red300 } from 'material-ui/lib/styles/colors';

import AppTheme from '../colortheme';
import actions from '../actions';
import HelpDialog from './HelpDialog.component';

import ChartLogins from './ChartLogins.component';
import FilterBy from './Filter.component.js';

//the day ranges for displaying data
const loginStatusRanges = [7, 15, 30, 60, 'Older','None'];
const loginStatusColors = [green300, lime300 , yellow300, orange300, deepOrange300, red300];

const DASH_USERGROUPS_CODE = 'BATapp_ShowOnDashboard';

const help = {
  help: (
    <div>
      <p>
        Summary metrics on user status.
      </p>
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

// TODO: Rewrite as ES6 class
/* eslint-disable react/prefer-es6-class */
export default React.createClass({

  propTypes: {
    d2: React.PropTypes.object,
    groups: React.PropTypes.object.isRequired,
    ouRoot: React.PropTypes.object.isRequired,
  },

  contextTypes: {
    d2: React.PropTypes.object,
  },

  getInitialState() {
    return {
      ouRoot: {},
      userGroups: {},          // all user groups, needed for filter

      attributeID: '',
      userGroupsFiltered: {},  // default display groups

      customFilterBy: null,
      customFilter: null,

      userAll: {},
      ouLevel: 1,
      waiting: 0,
    };
  },

  componentDidMount() {
    let fg = {};
    if (Object.keys(this.props.groups).length > 0) {
      fg = this.filterGroups(this.props.groups);
    }
    this.setState({
      userGroupsFiltered: fg,
      userGroups: this.props.groups,
      ouRoot: this.props.ouRoot,
      waiting: 0,
    });
    // this.getGroupLoginStats(false).then(res=>{
    //   this.setState({userAll:{
    //     all:{
    //       displayName:'All',
    //       id:'all',
    //       data:res
    //     }
    //   }})
    // });

  },


  getReport() {
    var nextProps = this.props;
    // this.getGroupLoginStats(false).then(res => {
    //   this.setState({
    //     userAll: {
    //       all: {
    //         displayName: 'All',
    //         id: 'all',
    //         data: res
    //       }
    //     }
    //   })
    // });

    let groups = nextProps.groups;
    let filtered = this.filterGroups(groups);
    this.setState({
      waiting: Object.keys(filtered).length,
      userGroups: groups
    });
    for (let ug of Object.keys(filtered)) {
      this.getGroupLoginStats(ug).then(res => {
        filtered[ug]['data'] = res;
        this.setState({
          userGroupsFiltered: filtered,
          waiting: this.state.waiting - 1,
        })
      });
    }
  },


  //group data from App.js
  componentWillReceiveProps(nextProps) {

    // this.getGroupLoginStats(false).then(res=>{
    //   this.setState({userAll:{
    //     all:{
    //       displayName:'All',
    //       id:'all',
    //       data:res
    //     }
    //   }})
    // });

    // let groups = nextProps.groups;
    // let filtered = this.filterGroups(groups);
    // this.setState({
    //   waiting:Object.keys(filtered).length,
    //   userGroups:groups
    // });
    // for (let ug of Object.keys(filtered)){
    //   this.getGroupLoginStats(ug).then(res=>{
    //    filtered[ug]['data']=res;
    //    this.setState({
    //      userGroupsFiltered:filtered,
    //      waiting:this.state.waiting-1,
    //    })
    //   });
    // }
  },

  //THey want to show a specific User group or org here
  handleFilterChange(filterBy, value) {
    this.setState({
      customFilterBy: filterBy,
      customFilter: value
    });
    console.log("CUSTOM CHART:", value);
    if (filterBy === 'group' && value !== null) {
      this.setState({ waiting: this.state.waiting + 1 });

      this.getGroupLoginStats(value).then(res => {
        console.log('res', res, filtered);
        let filtered = this.state.userGroupsFiltered;
        filtered[value] = {
          data: res,
          id: value,
          displayName: this.state.userGroups[value].displayName,
        };
        console.log('res', res, value, filtered);
        this.setState({
          userGroupsFiltered: filtered,
          waiting: this.state.waiting - 1,
        })
      });
    }
  },

  //get the UID for our secret sauce attribute
  getAttributeID() {
    if (this.state.attributeID !== '') {
      return this.state.attributeID;
    }
    for (let a of Object.keys(this.props.attribs)) {
      if (this.props.attribs[a] === DASH_USERGROUPS_CODE) {
        this.setState({ attributeID: a });
        return a;
      }
    }
    return '';
  },
  //filter out all non FILTER attributed groups
  filterGroups(groups) {
    //find the user group attrib ID for displayable UserGroups on the dashboard
    let attributeID = this.getAttributeID();

    //only keep the groups that are in our DASH_USERGROUPS_CODE
    let g = {};
    for (let ug of Object.keys(groups)) {
      if (groups[ug].hasOwnProperty('attributeValues')) {
        for (let attr in groups[ug].attributeValues) {
          if (groups[ug].attributeValues[attr].attribute.id === attributeID) {
            if (groups[ug].attributeValues[attr].value === 'true') {
              g[ug] = groups[ug];
            }
          }
        }
      }
    }
    return g;
  },

  //api/organisationUnits?fields=id,name,attributeValues&filter=attributeValues.attribute.id:eq:Zad5fRBS0c1
  filterOUs() {
    const d2 = this.props.d2;
    const api = d2.Api.getApi();
    let attributeID = this.getAttributeID();
    let search = {
      fields: 'id',
      pageSize: 1,
    };
    search.filter = ['attributeValues.attribute.id:eq:' + attributeID];
    api.get('organisationUnits', search).then(res => {

      console.log(res);

      // for (let ug of Object.keys(ous)){
      //   if (groups[ug].hasOwnProperty('attributeValues')){
      //     for (let attr in groups[ug].attributeValues){
      //       if (groups[ug].attributeValues[attr].attribute.id===attributeID){
      //         if (groups[ug].attributeValues[attr].value==='true'){
      //           g[ug]=groups[ug];
      //         }
      //       }
      //     }
      //   }
      // }
      //
      // if (u.hasOwnProperty('pager') && u.pager.hasOwnProperty('total')){
      //   return u.pager.total;
      // }

    });


  },

  async getGroupLoginStats(groupID) {
    let res = {};
    let previous = 0;
    for (let d in loginStatusRanges) {
      let count = await this.getRecentLoginStats(groupID, false, loginStatusRanges[d]);
      let prop = loginStatusRanges[d];
      if (prop === 'Older' || prop==='None') {
        if(prop==='Older')
          res[prop] = (count - previous);
        else 
          res[prop] = (res[prop]>=0?count+ res[prop]:count);
      }
      else {
          res[prop + ' days'] = (count - previous);        
        
      }
      previous = count;
    }
    return res;
  },

  //Find total users in group/ou
  async getRecentLoginStats(groupID, ou, days) {
    try {
      var noneCount=0;
      const d2 = this.props.d2;
      const api = d2.Api.getApi();
      let search = {
        fields: 'id,userCredentials[lastLogin,created]',
        pageSize: 1,
      };
      if (days !== 'Older' &&  days!='None') {
        var d = new Date();
        d.setDate(d.getDate() - days);
        search.lastLogin = d.toISOString().substr(0, 10);
      }
      search.filter = ['userCredentials.disabled:eq:false'];
      if (groupID !== false) {
        search.filter.push('userGroups.id:eq:' + groupID);
      }
      if (ou !== false) {
        search.ou = ou;
      }
      
      let u = await api.get('users', search);
      if(days=='None'){
        for (let resp of u.users){
          if(resp.userCredentials.lastLogin==resp.userCredentials.created){
            noneCount++;
          }
        };
        return noneCount;
      }else{
      if (u.hasOwnProperty('pager') && u.pager.hasOwnProperty('total')) {
        return u.pager.total;
      }
    }
    }
    catch (e) {
      console.error("Stat lookup failure:", groupID, ou, days, e);
    }
    return 0;
  },


  render() {
    const d2 = this.props.d2;
    let options_all = {
      colors: loginStatusColors,
      chart: { type: 'bar' },
      title: { text: 'Overall Active Login Status' },
      xAxis: { categories: [], },
      yAxis: { min: 0, title: { text: '% of users who have logged in within X days' } },
      legend: { reversed: false },
      tooltip: {
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.percentage:.0f}%)<br/>',
        shared: true
      },
      plotOptions: { series: { stacking: 'percent' } },
      series: []
    };

    let options_groups = {
      colors: loginStatusColors,
      chart: { type: 'bar', },
      title: { text: 'Login Status by Group' },
      xAxis: { categories: [], title: { text: 'User Group' }, },
      yAxis: { min: 0, title: { text: '% of users who have logged in within X days' } },
      legend: { reversed: false },
      tooltip: {
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.percentage:.0f}%)<br/>',
        shared: true
      },
      plotOptions: { series: { stacking: 'percent' } },
      series: []
    };

    let haveGroups = false;
    let haveFilteredGroups = false;
    if (Object.keys(this.props.groups).length > 0) {
      haveGroups = true;
    }
    if (haveGroups === true && Object.keys(this.props.groups).length > 0) {
      haveFilteredGroups = true;
    }

    return (
      <div className="wrapper">
        <HelpDialog style={{ float: "right" }} title={"App Help"} content={help.help} />

        <Paper style={{ 'width': '35%', 'float': 'right', 'padding': '5px' }}>

          <RaisedButton
            label="Get report"
            labelPosition="before"
            primary={true}
            disabled={this.state.processing}
            onClick={this.getReport}
            disabled={this.state.filterstatus == false}
            icon={<FontIcon className="material-icons">play_for_work</FontIcon>}
            style={{ 'clear': 'both' }}
          />
          <div style={{ height: "20px" }} ></div>
          <p>Add additional groups:</p>
          <FilterBy value={this.state.filterBy}
            onFilterChange={this.handleFilterChange}
            groups={this.props.groups}
            /* ouRoot={this.props.ouRoot} */
          />

        </Paper>

        <Paper className='paper' style={{ 'width': '61%' }}>
          <h3 className="subdued title_description">{d2.i18n.getTranslation('app_dashboard_user_access')}</h3>
          {/*   this isn't working when returning to the page after clicking on the Listing tab
                {Object.keys(this.state.userGroups).length>0?(
                  <ChartLogins container='chartAll' options={options_all} groups={this.state.userAll} />):null
                }
*/}
          <ChartLogins container='chartGroups' options={options_groups} groups={this.state.userGroupsFiltered} />

          {(haveGroups === true && haveFilteredGroups === false) ?
            (<p>No user groups with the {DASH_USERGROUPS_CODE} attribute found. Consult the help docs.</p>) : null
          }


          {(this.state.waiting && this.state.waiting > 0) ? <CircularProgress size={1} style={{ float: 'right' }} /> : null}
        </Paper>

      </div>
    );
  },
});
