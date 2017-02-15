import React from 'react';

import { getInstance } from 'd2/lib/d2';

import Paper from 'material-ui/lib/paper';
import Snackbar from 'material-ui/lib/snackbar';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/lib/table';
import CircularProgress from 'material-ui/lib/circular-progress';
import RaisedButton from 'material-ui/lib/raised-button';

import {green300, lightGreen300, yellow300, orange300, deepOrange300, red300} from 'material-ui/lib/styles/colors';

import AppTheme from '../colortheme';
import actions from '../actions';
import HelpDialog from './HelpDialog.component';

import ChartLogins from './ChartLogins.component';

//the day ranges for displaying data
const loginStatusRanges =[7,30,60,'Older'];
const loginStatusColors =[green300, yellow300, orange300, deepOrange300, red300];

const DASH_USERGROUPS = 'UG_DataUtilization';

const help = {
  help:(
    <div>
      <p>
        Summary metrics on user status.
      </p>
      <p>
        <b>Login Status By Group</b> will show user groups that have the <i>UG_DataUtilization</i> attribute assigned.
      </p>
      <h3>Setup</h3>
      <ul>
          <li>Open the <b>Maintenance</b> app</li>
          <li>Find the <b>Attribute</b> section</li>
          <li>If it does not exist, create a <i>UG_DataUtilization</i> Attribute</li>
          <li>Set the <b>Value type</b> to be <i>Yes/No</i></li>
          <li>Click the checkbox for <i>User group</i>, then Save</li>
          <li>Open the <b>Users</b> app and give partcular user groups this attribute.</li>
      </ul>
      <h3>Notes</h3>
      <ul>
        <li>For this app to function as intended, Non-SuperUsers must have a role containing "View User Group Managing Relationships".</li>
        <li>For speed considerations the number of User Groups with the UG_DataUtilization attribute should be kept under 20 but may be more or less depending on the speed of your connection and DHIS2 server.</li>
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
    },

    contextTypes: {
        d2: React.PropTypes.object,
    },

    getInitialState() {
      return {
        userGroups:{},
        userAll:{},
        ouLevel:1,
        waiting:0,
      };
    },

    componentDidMount() {
      this.setState({
        userGroups:this.filterGroups(this.props.groups),
        waiting:1,
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

    //group data from App.js
    componentWillReceiveProps(nextProps) {

      this.getGroupLoginStats(false).then(res=>{
        this.setState({userAll:{
          all:{
            displayName:'All',
            id:'all',
            data:res
          }
        }})
      });

      let groups = nextProps.groups;
      let filtered = this.filterGroups(groups);
      this.setState({waiting:Object.keys(filtered).length});
      for (let ug of Object.keys(filtered)){
        console.log(ug);
        this.getGroupLoginStats(ug).then(res=>{
         filtered[ug]['data']=res;
         this.setState({
           userGroups:filtered,
           waiting:this.state.waiting-1,
         })
        });
      }
    },
    //filter out all non FILTER attributed groups
    filterGroups(groups) {
      //find the user group attrib ID for displayable UserGroups on the dashboard
      let groupAttrib = '';
      for (let a of Object.keys(this.props.attribs)){
        if (this.props.attribs[a]===DASH_USERGROUPS){
          groupAttrib=a;
        }
      }
      //only keep the groups that are in our DASH_USERGROUPS
      let g = {};
      for (let ug of Object.keys(groups)){
        if (groups[ug].hasOwnProperty('attributeValues')){
          for (let attr in groups[ug].attributeValues){
            if (groups[ug].attributeValues[attr].attribute.id===groupAttrib){
              if (groups[ug].attributeValues[attr].value==='true'){
                g[ug]=groups[ug];
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
      for (let d in loginStatusRanges){
        let count = await this.getRecentLoginStats(groupID,false,loginStatusRanges[d]);
        let prop = loginStatusRanges[d];
        if (prop === 'Older'){
          res[prop]=(count-previous);
        }
        else{
          res[prop+' days']=(count-previous);
        }
        previous = count;
      }
      return res;
    },

    //Find total users in group/ou
    async getRecentLoginStats(groupID,ou,days) {
      try{
        const d2 = this.props.d2;
        const api = d2.Api.getApi();
        let search = {
          fields:'id',
          pageSize:1,
        };
        if (days!=='Older'){
          var d = new Date();
          d.setDate(d.getDate() - days);
          search.lastLogin=d.toISOString().substr(0,10);
        }
        search.filter=['userCredentials.disabled:eq:false'];
        if (groupID!==false){
          search.filter.push('userGroups.id:eq:'+groupID);
        }
        if (ou!==false){
          search.ou=ou;
        }
        let u = await api.get('users',search);
        if (u.hasOwnProperty('pager') && u.pager.hasOwnProperty('total')){
          return u.pager.total;
        }
      }
      catch (e){
        console.error("Stat lookup failure:",groupID,ou,days,e);
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
          xAxis: { categories: [], title:{ text: 'User Group'}, },
          yAxis: { min: 0, title: { text: '% of users who have logged in within X days' } },
          legend: { reversed: false },
          tooltip: {
              pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.percentage:.0f}%)<br/>',
              shared: true
          },
          plotOptions: { series: { stacking: 'percent' } },
          series: []
        };

        return (
            <div className="wrapper">
              <HelpDialog style={{float:"right"}} title={"App Help"} content={help.help} />

              <Paper className='paper' style={{'minWidth':'800px'}}>
                <h3 className="subdued title_description">{d2.i18n.getTranslation('app_dashboard')}</h3>
{/*   this isn't working when returning to the page after clicking on the Listing tab
                {Object.keys(this.state.userGroups).length>0?(
                  <ChartLogins container='chartAll' options={options_all} groups={this.state.userAll} />):null
                }
*/}

                <div> {/*  @TODO:: this wont work for installs that have no usergroups */}
                  {Object.keys(this.state.userGroups).length>0?(
                    <ChartLogins container='chartGroups' options={options_groups} groups={this.state.userGroups} />):
                    <CircularProgress />
                  }

                </div>
                { (this.state.waiting && this.state.waiting>0) ? <CircularProgress size={1} style={{float:'right'}}/> : null }
              </Paper>

          </div>
        );
    },
});
