import React from 'react';

import { getInstance } from 'd2/lib/d2';

import Paper from 'material-ui/lib/paper';
import Snackbar from 'material-ui/lib/snackbar';
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/lib/table';
import CircularProgress from 'material-ui/lib/circular-progress';
import RaisedButton from 'material-ui/lib/raised-button';
import FontIcon from 'material-ui/lib/font-icon';
import SelectField from 'material-ui/lib/select-field';
import MenuItem from 'material-ui/lib/menus/menu-item';

import { green300, lightGreen300, yellow300, orange300, deepOrange300, red300 } from 'material-ui/lib/styles/colors';

import AppTheme from '../colortheme';
import actions from '../actions';
import HelpDialog from './HelpDialog.component';

import ChartLogins from './ChartLogins.component';
import FilterBy from './Filter.component.js';

//the day ranges for displaying data
const loginStatusRanges = [7, 30, 60, 'Older'];
const loginStatusColors = [green300, yellow300, orange300, deepOrange300, red300];

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
      
      type:"Interpretation",
    };
  },

   //switch the type of search
  handleTypeChange(event, index, value) {
    this.setState({ type: value });
  },
  getReport() {
    var nextProps = this.props;
    this.getGroupLoginStats(false).then(res => {
      this.setState({
        userAll: {
          all: {
            displayName: 'All',
            id: 'all',
            data: res
          }
        }
      })
    });

    // let groups = nextProps.groups;
    // let filtered = this.filterGroups(groups);
    // this.setState({
    //   waiting: Object.keys(filtered).length,
    //   userGroups: groups
    // });
    // for (let ug of Object.keys(filtered)) {
    //   this.getGroupLoginStats(ug).then(res => {
    //     filtered[ug]['data'] = res;
    //     this.setState({
    //       userGroupsFiltered: filtered,
    //       waiting: this.state.waiting - 1,
    //     })
    //   });
    // }
  },


  async getGroupLoginStats(groupID) {
    let res = {};
    let previous = 0;
    for (let d in loginStatusRanges) {
      let count = await this.getRecentLoginStats(groupID, false, loginStatusRanges[d]);
      let prop = loginStatusRanges[d];
      if (prop === 'Older') {
        res[prop] = (count - previous);
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
      const d2 = this.props.d2;
      const api = d2.Api.getApi();
      let search = {
      fields: 'id,type,user[name,id],text,created,lastUpdated,text,comments[id,user[name,id],text,created,lastUpdated]'
      };
      let u = await api.get('interpretations', search);
      if (u.hasOwnProperty('interpretations')) {
        return u.pager.total;
      }
    }
    catch (e) {
      console.error("Error Cannot get Information");
    }
    return 0;
  },


  render() {
    const d2 = this.props.d2;
    console.log("aqui");
    let options_groups = {
      colors: loginStatusColors,
      chart: { type: 'bar', },
      title: { text: 'Interpretation and comment by user' },
      xAxis: { categories: [], title: { text: 'User' }, },
      yAxis: { min: 0, title: { text: '# of interpretations and comment by user' } },
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
          <SelectField value={this.state.type}
            onChange={this.handleTypeChange}
            autoWidth={true}
            disabled={this.state.filterstatus == false}
            floatingLabelText={d2.i18n.getTranslation('app_lbl_finduser')}
            maxHeight={100}
            style={{ 'float': 'left' }}>
            <MenuItem value='fresh' key='fresh' label={d2.i18n.getTranslation('app_opt_interpretation')} primaryText={d2.i18n.getTranslation('app_opt_interpretation')} />
            <MenuItem value='stale' key='stale' label={d2.i18n.getTranslation('app_opt_comment')} primaryText={d2.i18n.getTranslation('app_opt_comment')} />
          </SelectField>
          <RaisedButton
            label="Get report"
            labelPosition="before"
            primary={true}
            disabled={this.state.processing}
            onClick={this.getReport}
            disabled={this.state.filterstatus == false}
            icon={<FontIcon className="material-icons">get</FontIcon>}
            style={{ 'clear': 'both', 'float': 'left' }}
          />
          <div style={{ 'height': '50px' }}></div>

        </Paper>

        <Paper className='paper' style={{ 'width': '60%' }}>
          <h3 className="subdued title_description">{d2.i18n.getTranslation('app_dashboard_user_interpretation')}</h3>
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
