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

const help = {
  help:(
    <div>
      <p>
        Summary metrics on user status.
      </p>
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
        ouLevel:1,
      };
    },

    componentDidMount() {
      this.setState({userGroups:this.props.groups});
    },

    //group data from App.js
    componentWillReceiveProps(nextProps) {
      let groups = nextProps.groups;
      for (let ug of Object.keys(groups)){
        this.getGroupLoginStats(ug).then(res=>{
         groups[ug]['data']=res;
         this.setState({userGroups:groups})
        });
      }
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

        let options = {
          colors: loginStatusColors,
          chart: { type: 'bar', },
          title: { text: 'Login Status by Group' },
          xAxis: {
            categories: [],
            title:{ text: 'User Group'},
          },
          yAxis: {
            min: 0,
            title: { text: '% of users who have logged in within X days' }
          },
          legend: { reversed: false },
          tooltip: {
              pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.percentage:.0f}%)<br/>',
              shared: true
          },
          plotOptions: {
            series: { stacking: 'percent' }
          },
          series: []
        };

        return (
            <div className="wrapper">
              <HelpDialog style={{float:"right"}} title={"App Help"} content={help.help} />

              <Paper className='paper' style={{'minWidth':'800px'}}>
                <h3 className="subdued title_description">{d2.i18n.getTranslation('app_dashboard')}</h3>

                <div> {/*  @TODO:: this wont work for installs that have no usergroups */}
                  {Object.keys(this.state.userGroups).length>0?(
                    <ChartLogins container='chart' options={options} groups={this.state.userGroups} />):
                    null
                  }

                </div>
              </Paper>
          </div>
        );
    },
});
