import React from 'react';

import { getInstance } from 'd2/lib/d2';

import Paper from 'material-ui/Paper';
import Snackbar from 'material-ui/Snackbar';
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/Table';
import CircularProgress from 'material-ui/CircularProgress';
import RaisedButton from 'material-ui/RaisedButton';
import FontIcon from 'material-ui/FontIcon';

import { green300,lime300, lightGreen300, yellow300, orange300, deepOrange300, red300 } from 'material-ui/styles/colors';

import actions from '../actions';

import ChartLogins from './Chart.component';
import FilterGroups from './Filter.UserGroup.component.js';

import LoadingMask from 'd2-ui/lib/loading-mask/LoadingMask.component';
//the day ranges for displaying data
const loginStatusRanges = [7, 15, 30, 60, 'Older','None'];
const loginStatusColors = [green300, lime300 , yellow300, orange300, deepOrange300, red300];

const DASH_USERGROUPS_CODE = 'BATapp_ShowOnDashboard';

const styles={
  textSeach:{
    width:'100%'
  }
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
      userGroups: {},          // all user groups, needed for filter

      attributeID: '',
      userGroupsFiltered: {},  // default display groups
      customFilterBy: null,
      customFilter: null,
      waiting: 0,
      processing:false,
      renderChart:false,
      renderListGroups:false
    };
  },


  componentDidMount() {
     if (Object.keys(this.props.groups).length > 0) {
      this.setState({
        waiting:1,
        renderChart: false
      });
      this.initReport();
    }
     
  },
  clearAllSelected(){
    this.setState({userGroupsFiltered:{}});
  },
  seeReport(){
    console.log(this.state.userGroupsFiltered)
    this.setState({renderChart: true});
  },
  initReport() {
  
    let groups = this.props.groups;
    let filtered = this.filterGroups(groups);
    let arrUg=Object.keys(filtered)
    for (let ug of arrUg ) {
      this.getGroupLoginStats(ug).then(res => {
        filtered[ug]['data'] = res;
        if(arrUg[arrUg.length-1]==ug){
          this.setState({
            userGroupsFiltered: filtered,
            userGroups: this.props.groups,
            waiting: 0,
            renderListGroups:true,
            renderChart:false          
          })
        }        
      });
    }
  },



  //THey want to show a specific User group or org here
  handleFilterChange(filterBy, value) {
    //console.log("CUSTOM CHART:", value);
    //disable the button when is processing request
    this.setState({processing: true,renderChart: false});
    
    if (filterBy === 'group' && value !== null) {
      //this.setState({ waiting: this.state.waiting + 1 });

      this.getGroupLoginStats(value).then(res => {
        //console.log('res', res, filtered);
        let filtered = this.state.userGroupsFiltered;
        //if already there exist the uid then delete it from filter selected
        if(filtered[value]){
          delete filtered[value]
        }
        else{
            filtered[value] = {
              data: res,
              id: value,
              displayName: this.state.userGroups[value].displayName,
            };
        }
       //console.log(Object.keys(filtered).length);
       this.setState({
         userGroupsFiltered: filtered,
         waiting: this.state.waiting - 1,
         processing:false,
         renderChart: false
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
        this.setState({ attributeID: a,renderChart: false });
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

   rendercomponents(){

    const d2 = this.props.d2;
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

    <Paper style={{ 'width': '35%', 'float': 'right', 'padding': '5px' }}>
      <p>{d2.i18n.getTranslation("app_ttl_filterUser")}</p>
      <FilterGroups value={this.state.filterBy}
        onFilterChange={this.handleFilterChange}
        groups={this.props.groups}
        groupsfiltered={this.state.userGroupsFiltered}
        disabled={this.state.processing}
        clearSelected={this.clearAllSelected}
      />
      <RaisedButton
        label={d2.i18n.getTranslation("app_btn_update")}
        labelPosition="before"
        primary={true}
        disabled={this.state.processing}
        onClick={this.seeReport}
        icon={<FontIcon className="material-icons">refresh</FontIcon>}
        style={{ 'clear': 'both' }}
      />
      {this.state.processing?<CircularProgress size={1} style={{ float: 'right' }} />:""}

    </Paper>

    <Paper className='paper' style={{ 'width': '61%' }}>

      <ChartLogins container='chartGroups' options={options_groups} groups={this.state.userGroupsFiltered} renderChart={this.state.renderChart}/>

      {(haveGroups === true && haveFilteredGroups === false) ?
        (<p>No user groups with the {DASH_USERGROUPS_CODE} attribute found. Consult the help docs.</p>) : null
      }


      {(this.state.waiting && this.state.waiting > 0) ? <CircularProgress size={1} style={{ float: 'right' }} /> : null}
    </Paper>

  </div>
    )
  },

  render() {   
  return (
      <div>
        {this.state.renderListGroups?this.rendercomponents():<LoadingMask />}
      </div>
      
    );
  },
});
