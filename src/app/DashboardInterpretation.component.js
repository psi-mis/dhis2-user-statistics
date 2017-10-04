import React from 'react';

import { getInstance } from 'd2/lib/d2';

import Paper from 'material-ui/lib/paper';
import Snackbar from 'material-ui/lib/snackbar';
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/lib/table';
import CircularProgress from 'material-ui/lib/circular-progress';
import RaisedButton from 'material-ui/lib/raised-button';
import FontIcon from 'material-ui/lib/font-icon';

import { green300, lime300, lightGreen300, yellow300, orange300, deepOrange300, red300 } from 'material-ui/lib/styles/colors';

import AppTheme from '../colortheme';
import actions from '../actions';
import HelpDialog from './HelpDialog.component';

import ChartInterpretation from './ChartInterpretation.component';
import FilterBy from './Filter.component.js';

//the day ranges for displaying data
const loginStatusRanges = [7, 30, 60, 'Older'];
const loginStatusColors = [green300, lime300, yellow300, orange300, deepOrange300, red300];

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
      rawUserGroups: {},
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
      // fg = this.filterGroups(this.props.groups);
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
    this.handleReportStatus();
    this.setState({
      customFilterBy: filterBy,
      customFilter: value
    });
    console.log("CUSTOM CHART:", value);
    if (filterBy === 'group' && value !== null) {
      this.setState({ waiting: this.state.waiting + 1 });
      this.addGroup(value);

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

  addGroup(uid) {
    let groups = this.state.rawUserGroups;
    if (groups[uid]) {
      this.state.userGroupsFiltered[uid] = groups[uid];
    }
    else {
      this.state.userGroupsFiltered[uid] = { "id": uid, "displayName": this.props.groups[uid].displayName, "data": { "7 Days": 0, "15 Days": 0, "30 Days": 0, "60 Days": 0, "Older": 0, "None": this.props.groups[uid].users.length } };

    }
    this.setState({ waiting: 0 });
  },
  //filter out all non FILTER attributed groups
  filterGroups(groups) {
    //find the user group attrib ID for displayable UserGroups on the dashboard
    let attributeID = this.getAttributeID();

    //only keep the groups that are in our DASH_USERGROUPS_CODE
    let g = {};
    for (let ug of Object.keys(groups)) {
      if (this.props.groups[ug].attributeValues.length > 0) {
        groups[ug].attributeValues = this.props.groups[ug].attributeValues;
      }
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

      for (let ug of Object.keys(ous)) {
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

      if (u.hasOwnProperty('pager') && u.pager.hasOwnProperty('total')) {
        return u.pager.total;
      }

    });


  },

  //switch the type of search
  handleReportStatus() {
    this.getReport().then(responseReport => {
      this.aggregateResult(responseReport).then(resAgregated => {
        this.SetChart(resAgregated).then(respChard => {
          this.setState({
            userGroupsFiltered: respChard
          });
          this.setState({
            userGroupsFiltered: respChard
          });
        });
      });
    });
    // this.setState({ reportStatus: true });
  },
  //Get different in days  between two dates.
  getCategory(dateinit, dateend) {
    var DateInitt = new Date(dateinit).getTime();
    var dateEndt = new Date(dateend).getTime();
    var diff = (dateEndt - DateInitt) / (1000 * 60 * 60 * 24)
    switch (true) {
      case diff <= 7:
        return ("7 Days");
        break;
      case diff <= 15:
        return ("15 Days");
        break;
      case diff <= 30:
        return ("30 Days");
        break;
      case diff <= 60:
        return ("60 Days");
        break;
      default:
        return ("Older")
    }
  },
  //agregate API result 

  async aggregateResult(dataValues) {
    var aggregateValue = [];
    var lastdateInterpretation = null;
    var lastdateComment = null;
    dataValues.map((dataValue) => {
      dataValue.user.userGroups.map((userGroup) => {
        //verify if user group already there exist in array
        var index = aggregateValue.findIndex(x => x.id === dataValue.user.id + "-" + userGroup.id);
        if (index === -1) {
          aggregateValue.push({ "id": dataValue.user.id + "-" + userGroup.id, "user": dataValue.user.id, "userName": dataValue.user.name, "created": dataValue.created, "userGroupName": userGroup.name, "userGroupId": userGroup.id });
        }
        else {
          var dateInterpretation = new Date(dataValue.created);
          if (dateInterpretation > lastdateInterpretation) {
            aggregateValue[index] = { "id": dataValue.user.id + "-" + userGroup.id, "user": dataValue.user.id, "userName": dataValue.user.name, "created": dataValue.created, "userGroupName": userGroup.name, "userGroupId": userGroup.id };
            lastdateInterpretation = dateInterpretation;
          }
        }

      });
      dataValue.comments.map((dataValuecomm) => {
        dataValuecomm.user.userGroups.map((userGroupCom) => {
          var indexm = aggregateValue.findIndex(x => x.id === dataValuecomm.user.id + "-" + userGroupCom.id);
          if (indexm === -1) {
            aggregateValue.push({ "id": dataValuecomm.user.id + "-" + userGroupCom.id, "user": dataValuecomm.user.id, "userName": dataValuecomm.user.name, "created": dataValuecomm.created, "userGroupName": userGroupCom.name, "userGroupId": userGroupCom.id });
          }
          else {
            var dateComment = new Date(dataValuecomm.created);
            if (dateComment > lastdateComment) {
              aggregateValue[indexm] = { "id": dataValuecomm.user.id + "-" + userGroupCom.id, "user": dataValuecomm.user.id, "userName": dataValuecomm.user.name, "created": dataValuecomm.created, "userGroupName": userGroupCom.name, "userGroupId": userGroupCom.id };
            }
          }
        });

      });
    });
    return aggregateValue;
  },
  getGroup(uid) {
    let groups = this.state.userGroups;

    for (let g in groups) {
      if (g == uid) {
        return groups[g].users.length;
      }
    };
    return 0;
  },
  //set result to Chart value 
  async SetChart(dataValuesAgregated) {
    var aggregateCaregory = [];
    var lastdateInterpretation = null;
    var lastdateComment = null;
    let fg = {};
    dataValuesAgregated.map((dataValue) => {
      //add Interpretation
      var currentDate = new Date();
      let category = this.getCategory(dataValue.created.substring(0, 10), currentDate.toISOString().substring(0, 10));
      //verify if user grup already there exist in array
      var index = aggregateCaregory.findIndex(x => (x.userGroupid === dataValue.userGroupid));
      try {
        if (this.state.userGroups[dataValue.userGroupId] != undefined) {
          //get list all user 
          if (aggregateCaregory[dataValue.userGroupId] == undefined) {

            //let NumUser=  this.getGroup(dataValue.userGroupId); 
            aggregateCaregory[dataValue.userGroupId] = { "id": dataValue.userGroupId, "displayName": dataValue.userGroupName, "data": { "7 Days": 0, "15 Days": 0, "30 Days": 0, "60 Days": 0, "Older": 0, "None": this.state.userGroups[dataValue.userGroupId].users.length } };
            aggregateCaregory[dataValue.userGroupId].data[category] = 1;
            aggregateCaregory[dataValue.userGroupId].data["None"]--;

          }
          else {
            aggregateCaregory[dataValue.userGroupId].data["None"]--;
            if (aggregateCaregory[dataValue.userGroupId].data[category])
              aggregateCaregory[dataValue.userGroupId].data[category]++;
            else
              aggregateCaregory[dataValue.userGroupId].data[category] = 1;
          }
        }
        else {
          console.log("El usuario no tiene acceso al grupo " + dataValue.userGroupName);
        }
      }
      catch (err) {
        console.log("error usuario no tiene acceso al grupo " + dataValue.userGroupName);
      };

    });
    this.setState({
      rawUserGroups: aggregateCaregory
    });

    fg = this.filterGroups(aggregateCaregory);
    return fg;
  },

  //Find total users in group/ou
  async  getReport() {
    const d2 = this.props.d2;
    const api = d2.Api.getApi();
    let search = {
      fields: 'id,type,user[name,id,userGroups[id,name]],created,lastUpdated,comments[id,user[name,id,userGroups[id,name,attributeValue]],created,lastUpdated]'
    };
    let resultApi = await api.get('interpretations', search)
    if (resultApi.hasOwnProperty('interpretations')) {
      return resultApi.interpretations;
    }
    else {
      this.setState({
        data: {},
        processing: false,
      });
      return null;
    }
  },

  render() {
    const d2 = this.props.d2;
    let options_all = {
      colors: loginStatusColors,
      chart: { type: 'bar' },
      title: { text: 'Overall Active Login Status' },
      xAxis: { categories: [], },
      yAxis: { min: 0, title: { text: '% of users who have Interpreted or Commented in within X days' } },
      legend: { reversed: false },
      tooltip: {
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.percentage:.0f}%)<br/>',
        shared: true
      },
      plotOptions: { series: { stacking: 'percent' } },
      series: [{ "name": "7 Days" }, { "name": "15 Days" }, { "name": "30 Days" }, { "name": "60 Days" }, { "name": "Older" }, { "name": "None" }]
    };

    let options_groups = {
      colors: loginStatusColors,
      chart: { type: 'bar', },
      title: { text: 'Interpretations and Comments by Group' },
      xAxis: { categories: [], title: { text: 'User Group' }, },
      yAxis: { min: 0, title: { text: '% of users who have Interpreted or Commented in within X dayss' } },
      legend: { reversed: false },
      tooltip: {
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.percentage:.0f}%)<br/>',
        shared: true
      },
      plotOptions: { series: { stacking: 'percent' } },
      series: [{ "name": "7 Days" }, { "name": "15 Days" }, { "name": "30 Days" }, { "name": "60 Days" }, { "name": "Older" }, { "name": "None" }]
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
            onClick={this.handleReportStatus}
            disabled={this.state.filterstatus == false}
            icon={<FontIcon className="material-icons">play_for_work</FontIcon>}
            style={{ 'clear': 'both' }}
          />
          <div style={{ height: "20px" }} ></div>
          <p>Add additional groups:</p>
          <FilterBy value={this.state.filterBy}
            onFilterChange={this.handleFilterChange}
            groups={this.props.groups}
            ouRoot={this.props.ouRoot}
          />

        </Paper>

        <Paper className='paper' style={{ 'width': '61%' }}>
          <h3 className="subdued title_description">{d2.i18n.getTranslation('app_dashboard_user_interpretation')}</h3>
          {/*   this isn't working when returning to the page after clicking on the Listing tab
                {Object.keys(this.state.userGroups).length>0?(
                  <ChartInterpretation container='chartAll' options={options_all} groups={this.state.userAll} />):null
                }
*/}
          <ChartInterpretation container='chartGroups' options={options_groups} groups={this.state.userGroupsFiltered} />

          {(haveGroups === true && haveFilteredGroups === false) ?
            (<p>No user groups with the {DASH_USERGROUPS_CODE} attribute found. Consult the help docs.</p>) : null
          }


          {(this.state.waiting && this.state.waiting > 0) ? <CircularProgress size={1} style={{ float: 'right' }} /> : null}
        </Paper>

      </div>
    );
  },
});
