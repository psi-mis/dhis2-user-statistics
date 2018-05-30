import React from 'react';

import { getInstance } from 'd2/lib/d2';
import OrgUnitTree from 'd2-ui/lib/org-unit-tree/OrgUnitTree.component';


import Paper from 'material-ui/Paper';
import FontIcon from 'material-ui/FontIcon';
import RaisedButton from 'material-ui/RaisedButton';

import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/Table';
import CircularProgress from 'material-ui/CircularProgress';

import Checkbox from 'material-ui/CheckBox';
import TextField from 'material-ui/TextField';
import { green500, red500 } from 'material-ui/styles/colors';

import FilterBy from './Filter.component.js';


import actions from '../actions';


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
      userGroups: {},
      userGroupsFiltered:{},
      type: 'commInt',       // commInt (show comment and interpretation)
      filterBy: 'none',    // none, group, ou
      data: [],
      tags: [],
      suggestions: [],
      pager: { page: 0, pageCount: 0, pageSize: 0, total: 0 },
      disabledfiter:false
    };
  },
  //make sure we have our necessary select box data
  componentDidMount() {
    //dispath the Interprtation search when page is loaded.
    this.setState({
      userGroups: this.props.groups,
      ouRoot: this.props.ouRoot
    });
  },

  //switch the type of search
  handleFilter(event, index, value) {
    this.setState({ type: value });
  },
  //they want to look up a particular person
  handleUserChange(event) {
    this.setState({ filterUsername: event.target.value });
  },
  ClearFilters() {
    this.setState({ filterUsername: "" });
    this.setState({ type: "commInt" });
    this.setState({disabledfiter:false});
  },
  //agregate API result
  aggregateResult(dataValues) {
    var aggregateValue = [];
    var lastdateInterpretation = null;
    var lastdateComment = null;
    dataValues.map((dataValue) => {
      //add Interpretation
      if(dataValue.user==undefined){
        dataValue.user=dataValue.reportTable.user;
      }
      var index = aggregateValue.findIndex(x => x.user === dataValue.user.id);
      if (index === -1) {
        aggregateValue.push({ "id": dataValue.id, "user": dataValue.user.id, "userName": dataValue.user.name, "InterpretationCreated": dataValue.created, "commentCreated": "1900-01-01", userGroups: dataValue.user.userGroups, organisationUnits: dataValue.user.organisationUnits, "totalInterpretation": 1, "totalComment": 0 });
      }
      else {
        var dateInterpretation = new Date(dataValue.created);
        var lastdateInterpretation = new Date(aggregateValue[index].InterpretationCreated);
        if (isNaN(lastdateInterpretation.getTime())) {
          var lastdateInterpretation = new Date("1900-01-01")
        }
        if (dateInterpretation > lastdateInterpretation) {
          aggregateValue[index].InterpretationCreated = dataValue.created;
        }
        aggregateValue[index].totalInterpretation++;
      }
      dataValue.comments.map((dataValuecomm) => {
        var indexm = aggregateValue.findIndex(x => x.user === dataValuecomm.user.id);
        if (indexm === -1) {
          aggregateValue.push({ "id": dataValuecomm.id, "user": dataValuecomm.user.id, "userName": dataValuecomm.user.name, "InterpretationCreated": "1900-01-01", "commentCreated": dataValuecomm.created, userGroups: dataValuecomm.user.userGroups, organisationUnits: dataValuecomm.user.organisationUnits, "totalInterpretation": 0, "totalComment": 1 });
        }
        else {
          var dateComment = new Date(dataValuecomm.created);
          var lastdateComment = new Date(aggregateValue[indexm].commentCreated);
          if (isNaN(lastdateComment.getTime())) {
            var lastdateComment = new Date("1900-01-01")
          }
          if (dateComment > lastdateComment) {
            aggregateValue[indexm].commentCreated = dataValuecomm.created;
          }
          aggregateValue[indexm].totalComment++;
        }

      });
    });
    return aggregateValue;
  },

  getInterpretation() {
    const d2 = this.props.d2;
    const api = d2.Api.getApi();
    this.setState({ processing: true, data: [] });

    //figure out the lastLoginDate as an actual Date
    var lastLoginDate = new Date();
    lastLoginDate.setDate(lastLoginDate.getDate() - this.state.days);
    let search = {
      fields: 'id,type,user[name,id,userGroups[id],organisationUnits[id,path]],created,lastUpdated,comments[id,user[name,id,userGroups[id],organisationUnits[id,path]],created,lastUpdated],reportTable[user[name,id,userGroups[id],organisationUnits[id,path]]]',
      paging:false
    };
    api.get('interpretations', search).then(promise => {
      if (promise.hasOwnProperty('interpretations')) {
        var dataValue = this.aggregateResult(promise.interpretations);
        this.setState({
          data: dataValue,
          pager: { total: dataValue.length },
          processing: false,
          disabledfiter: false
        });
      }
      else {
        this.setState({
          data: [],
          processing: false,
          disabledfiter:false
        })
      }
    })
      .catch(error => {
        this.setState({ processing: false, errors: error });
      });

  },

  //update how they want to filter the data
  handleFilterChange(filterBy, value) {
    //toggle the search children box if they switch from group to ou
    let searchChildren = false;

    this.setState({
      filterBy
    })

    if (this.state.filterBy === 'ou') {
        searchChildren = this.state.searchChildOUs;
        this.setState({ filter: value, filterBy: filterBy, searchChildOUs: searchChildren });
        this.getChildOUs();
    }
    else if (this.state.filterBy === 'group'){
      this.handleFilterChangeUserGRoup(filterBy, value);
    }
    else{
      this.setState({
        userGroupsFiltered:{}
      })
    }
  },

  ClearFilters() {
    this.setState({ filterUsername: "" });
    this.setState({ filterBy: 'none' });
    this.setState({ days: 90 });
    this.setState({ type: 'stale' });
    this.setState({ searchChildOUs: false });
    this.setState({ filterDisabled: false });
  },

  //Include Child OUs checkbox
  handleFilterChildOUs(event, value) {
    if (value === true && this.state.filter !== null) {
      actions.showSnackbarMessage("Depending on the tree depth this may be slow. Wait a moment.");
    }
    this.setState({ searchChildOUs: value });
   // this.getChildOUs();
  },
  async getChildOUs() {
    if (this.state.filterBy === 'ou' && this.state.searchChildOUs === true && this.state.ouRoot.id !== this.state.filter && this.state.filter !== null) {
      this.setState({ processing: true });
      this.getOrgChildren(this.state.filter).then(children => {
        this.setState({ orgChildren: children, processing: false });
      });
    }
  },

  //recursively find all children of id. return array of IDs
  async getOrgChildren(id) {
    const d2 = this.props.d2;
    let nodes = [id];
    let m = await d2.models.organisationUnits.get(id);
    if (m.id === id) {
      if (m.hasOwnProperty('children') && m.children !== undefined) {
        if (m.children.size === 0) {
          return nodes;
        }
        for (let child of m.children) {
          let c = await this.getOrgChildren(child[0]);
          nodes = nodes.concat(c);
        }
        return nodes;
      }
      else {   //other way to get no children
        return nodes;
      }
    }
    return nodes;
  },

  //THey want to show a specific User group or org here
  handleFilterChangeUserGRoup(filterBy, value) {
    //console.log("CUSTOM CHART:", value);
    //disable the button when is processing request
    
    if (value !== null) {
        let filtered = this.state.userGroupsFiltered;
        //if already there exist the uid then delete it from filter selected
        if(filtered[value]){
          delete filtered[value]
        }
        else{
            filtered[value] = {
              id: value
            };
        }
        //console.log(Object.keys(filtered).length);
        this.setState({
          userGroupsFiltered: filtered,
          filterBy:'group'
        })
      }
  },

  // async getChildOUs() {
  //   if (this.state.filterBy === 'ou' && this.state.searchChildOUs === true && this.state.ouRoot.id !== this.state.filter && this.state.filter !== null) {
  //     this.setState({ processing: true });
  //     this.getOrgChildren(this.state.filter).then(children => {
  //       this.setState({ orgChildren: children, processing: false });
  //     });
  //   }
  // },

  //recursively find all children of id. return array of IDs
  async getOrgChildren(id) {
    const d2 = this.props.d2;
    let nodes = [id];
    let m = await d2.models.organisationUnits.get(id);
    if (m.id === id) {
      if (m.hasOwnProperty('children') && m.children !== undefined) {
        if (m.children.size === 0) {
          return nodes;
        }
        for (let child of m.children) {
          let c = await this.getOrgChildren(child[0]);
          nodes = nodes.concat(c);
        }
        return nodes;
      }
      else {   //other way to get no children
        return nodes;
      }
    }
    return nodes;
  },

  //The search button was pressed
  process() {

  },
  render() {
    const d2 = this.props.d2;
    //count of register
    var countReg = 0;
    let users = this.state.data.map((row) => {
      //Filters done, display records
      //Do some filtering...
      if (this.state.filterBy === 'group' && Object.keys(this.state.userGroupsFiltered).length > 0) {
        let found = false;
        for (let g of row.userGroups) {
          for (let u in this.state.userGroupsFiltered) {
            if (g.id === u) {
              console.log(row)
              found = true;
            }
          }
        }
        if (found === false) {
          return null;
        }
      }
      else if (this.state.filterBy === 'ou') {
        let found = false;
        for (let g of row.organisationUnits) {
          if (g.id === this.state.filter) {
            found = true;
          }
          if (g.path.includes(this.state.filter) === true && this.state.searchChildOUs === true)
            found = true
          //child OUs
          // if (this.state.searchChildOUs === true && this.state.orgChildren.indexOf(g.id) >= 0) {
          //   found = true;
          // }
        }
        if (found === false) {
          return null;
        }
      }

      //match with username
      if (row.userName.includes(this.state.filterUsername) == false && this.state.filterUsername != "" && this.state.filterUsername != undefined) {
        return null
      }
      //count of register
      countReg = countReg + 1;
      //; 
      return (
        <TableRow key={row.id}>
          <TableRowColumn>{row.userName}</TableRowColumn>
          <TableRowColumn>{(row.InterpretationCreated == "1900-01-01" ? "-" : row.InterpretationCreated.substring(0, 10))}</TableRowColumn>
          <TableRowColumn>{(row.commentCreated == "1900-01-01" ? "-" : row.commentCreated.substring(0, 10))}</TableRowColumn>
          <TableRowColumn>{row.totalInterpretation}</TableRowColumn>
          <TableRowColumn>{row.totalComment}</TableRowColumn>
        </TableRow>
      )
    });
    return (
      <div className="wrapper">
        <Paper className='paper' style={{ 'minWidth': '50%' }}>
          <h3 className="subdued title_description">{d2.i18n.getTranslation('app_title_filter_Interpretation')}</h3>
          <div style={{ 'width': '30%', 'float': 'left' }}>
            <TextField hintText="Name"
              floatingLabelText="With name containing"
              floatingLabelFixed={true}
              value={this.state.filterUsername}
              disabled={this.state.disabledfiter}
              onChange={this.handleUserChange} />
            <Checkbox label={d2.i18n.getTranslation("app_lbl_filter_include_child_ou")}
              checked={this.state.searchChildOUs}
              onCheck={this.handleFilterChildOUs}
              disabled={this.state.filterBy != 'ou' || this.state.ouRoot.id === this.state.filter || this.props.disabledfiter==true}
              labelStyle={{ color: 'grey', fontSize: 'small' }}
            />

          </div>
          <div style={{ 'width': '30%', 'float': 'left' }}>
            <FilterBy value={this.state.filterBy}
              onFilterChange={this.handleFilterChange}
              groups={this.state.userGroups}
              ouRoot={this.props.ouRoot}
              disabledFilter={this.state.disabledfiter}
            />
          </div>
          <div style={{ 'width': '40%', 'float': 'right' }}>
            <div style={{ 'height': '25px' }}></div>
            <table>
              <tbody>
                <tr>
                  <td>
                    <RaisedButton
                      label="Search"
                      labelPosition="before"
                      primary={true}
                      disabled={this.state.processing}
                      onClick={this.getInterpretation}
                      disabled={this.state.filterstatus == false}
                      icon={<FontIcon className="material-icons">search</FontIcon>}
                      style={{ 'clear': 'both', 'float': 'left' }}
                    />
                  </td>
                  <td>
                    <RaisedButton
                      label="Clear filter"
                      labelPosition="before"
                      primary={true}
                      disabled={this.state.processing}
                      onClick={this.ClearFilters}
                      disabled={this.state.filterstatus == false}
                      icon={<FontIcon className="material-icons">settings_backup_restore</FontIcon>}
                      style={{ 'clear': 'both', 'float': 'left' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>


          <div>
            {(this.state.processing === true) ? <CircularProgress /> : null}
          </div>


        </Paper>

        <Paper className="paper" style={{ 'float': 'left', 'clear': 'both' }}>


          <Table selectable={false}>
            <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
              <TableRow selectable={false}>
                <TableHeaderColumn>
                  UserName
                      </TableHeaderColumn>
                <TableHeaderColumn>
                  Last Interpretation Created
                      </TableHeaderColumn>
                <TableHeaderColumn>
                  Last Comment Created
                      </TableHeaderColumn>
                <TableHeaderColumn>
                  Number of Interprations
                </TableHeaderColumn>
                <TableHeaderColumn>
                  Number of Comments
                </TableHeaderColumn>
              </TableRow>
            </TableHeader>
            <TableBody
              displayRowCheckbox={false}
              showRowHover={true}
              stripedRows={true}
            >
              {users}
            </TableBody>
          </Table>
          {(this.state.processing === true) ? <CircularProgress /> : null}
        </Paper>

        <Paper className='paper'>
          <ul>
            <li>Total Records: {this.state.pager.total}</li>
            <li> Loaded: {countReg} </li>
            <li>errors:{this.state.errors}</li>
          </ul>
        </Paper>

      </div>
    );

  },
});
