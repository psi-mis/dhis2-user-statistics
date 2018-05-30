import React from 'react';

import { getInstance } from 'd2/lib/d2';
import OrgUnitTree from 'd2-ui/lib/org-unit-tree/OrgUnitTree.component';


import Paper from 'material-ui/Paper';
import FontIcon from 'material-ui/FontIcon';
import RaisedButton from 'material-ui/RaisedButton';
import IconButton from 'material-ui/IconButton';
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/Table';
import CircularProgress from 'material-ui/CircularProgress';

import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import CheckboxUI from 'material-ui/Checkbox';
import TextField from 'material-ui/TextField';
import Slider from 'material-ui/Slider';
import { green500, red500 } from 'material-ui/styles/colors';

import FilterBy from './Filter.component.js';

import HelpDialog from './HelpDialog.component';
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
      userGroups: {},      // all user groups, needed for filter
      type: 'stale',       // stale (longer than X days), fresh (within past X days)
      days: 90,            // # days
      data: [],            // resulting user list
      filterBy: 'none',    // none, group, ou
      filterUsername: '',  // for finding a particular person
      filter: null,
      filterstatus: false,
      filterDisabled: false, // hide disabled users
      //          invertFilter:false, // select everyone not in the given params
      //ouRoot:null,        // top of the OU tree, needed for OrgUnitTree
      searchChildOUs: false,
      orgChildren: [],     // the children of the selected OU
      urlPath: '',         // server path, needed for user edit link
      processing: false,
      errors: '',
      pager: { page: 0, pageCount: 0, pageSize: 0, total: 0 },
      userGroupsFiltered: {}
    };
  },

  //make sure we have our necessary select box data
  componentDidMount() {
    //get the base URL for the DHIS install for spooky action at a distance.
    let href = window.location.href;
    //on a app the system path starts with /api so chop off everything from there
    if (href.indexOf('/api/') !== -1) {
      href = href.slice(0, href.indexOf('/api/'));
    }
    this.setState({
      urlPath: href,
      userGroups: this.props.groups,
      ouRoot: this.props.ouRoot
    });
  },

  //group and OU root data from App.js
  componentWillReceiveProps(nextProps) {
    this.setState({
      userGroups: nextProps.groups,
      ouRoot: nextProps.ouRoot
    });
  },

  //switch the type of search
  handleTypeChange(event, index, value) {
    this.setState({ type: value });
  },

  //they want to look up a particular person
  handleUserChange(event) {
    this.setState({ filterUsername: event.target.value });
  },

  //they changed the number of days
  handleLengthChange(event, index, value) {
    this.setState({ days: index });
  },

  handleFilterDisabled(event, value) {
    this.setState({ filterDisabled: value });
  },

  handlefilterstatus(event, value) {  
   // this.ClearFilters();
     this.setState({ filterstatus: value });
    this.setState({ days: 90 });
  },

  //Toggling of user disabled listing
  handleDisableUser(user) {
    const d2 = this.props.d2;
    const api = d2.Api.getApi();

    let data = {
      username: user.userCredentials.username,
    };
    if (user.userCredentials.disabled === true) {  //toggle to enable
      data.enable = true;
    }
    //send the enable/disable request
    api.jquery
      .ajax({
        type: 'POST',
        url: this.state.urlPath + '/dhis-web-maintenance-user/disableUser.action',
        data: data
      })
      .done((res, textStatus, xhr) => {
        //Worked! Update the UI
        if (xhr.status === 200 && xhr.statusText === 'OK') {
          user.userCredentials.disabled = !user.userCredentials.disabled;
          let users = this.state.data;
          for (let i in users) {
            if (users[i].id === user.id) {
              console.log('found');
              users[i].userCredentials.disabled = user.userCredentials.disabled;
              actions.showSnackbarMessage("User ''" + user.userCredentials.username + "' updated'");
              break;
            }
          }
          this.setState({ data: users });
        }
      })
      .fail(err => {
        this.setState({ errors: err });
      })
      .always(() => {

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
    else{
      this.handleFilterChangeUserGRoup(filterBy, value);
    }
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
    this.getChildOUs();
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

  //The search button was pressed
  process() {
    const d2 = this.props.d2;
    const api = d2.Api.getApi();
    this.setState({ processing: true, data: [] });

    //figure out the lastLoginDate as an actual Date
    var lastLoginDate = new Date();
    lastLoginDate.setDate(lastLoginDate.getDate() - this.state.days);

    let search = {
      fields: '*',
      paging: false,
    };
    if (this.state.type === 'fresh' && this.state.filterstatus==true) {
      search.lastLogin = lastLoginDate.toISOString().substr(0, 10);
    }
    else if (this.state.type === 'stale'&& this.state.filterstatus==true) {
      search.inactiveSince = lastLoginDate.toISOString().substr(0, 10);
    }
    if (this.state.filterBy === 'ou' && this.state.filter !== false && this.state.filterstatus==true) {
      search.ou = this.state.filter;
    }
    if (this.state.filterBy === 'group' && this.state.filter !== false && this.state.filterstatus==true) {
        let listUG="";
        for(let gs in this.state.userGroupsFiltered){
          listUG=(listUG==""?gs:listUG+","+gs)
        }
        if(listUG!=""){
          search.filter = ['userGroups.id:in:[' + listUG+"]"];
        }         
    }
    if (this.state.filterUsername !== '' && this.state.filterstatus==true) {
      search.query = this.state.filterUsername;
    }

    if (this.state.filterBy === 'ou' && this.state.searchChildOUs === true) {
      //get the ou children first
      this.getOrgChildren(this.state.filter).then(children => {
        //need to issue multiple queries to get all the children OUs
        this.getMultiOrgUsers(search, children)
          .then(res => {
            this.setState({
              data: res.data,
              pager: res.pager,
              processing: false,
            });
          });
      });
    }
    else {
      api.get('users', search).then(promise => {
        if (promise.hasOwnProperty('users')) {
          this.setState({
            data: promise.users,
            pager: promise.pager,
            processing: false,
          });
        }
        else {
          this.setState({
            data: [],
            processing: false,
          })
        }
      })
        .catch(error => {
          this.setState({ processing: false, errors: error });
        });
    }

  },

  async getMultiOrgUsers(search, ous) {
    const d2 = this.props.d2;
    const api = d2.Api.getApi();
    let users = [];
    let pager = { page: 0, pageCount: 0, total: 0, pageSize: 0 };
    for (let ou of ous) {
      search.ou = ou;
      let s = await api.get('users', search);
      if (s.hasOwnProperty('users')) {
        users = users.concat(s.users);
        pager.total = s.pager.total + pager.total;
      }
    }
    return { data: users, pager: pager };
  },

  render() {
    const d2 = this.props.d2;
    let users = this.state.data.map((row) => {
      //Do some filtering...
      if (this.state.filterBy === 'group' && Object.keys(this.state.userGroupsFiltered).length>0) {
        let found = false;
        for (let g of row.userGroups) {
          for(let gs in this.state.userGroupsFiltered){
          if (g.id === gs) {
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
          //child OUs
          if (this.state.searchChildOUs === true && this.state.orgChildren.indexOf(g.id) >= 0) {
            found = true;
          }
        }
        if (found === false) {
          return null;
        }
      }
      //hide disabled records
      if (this.state.filterDisabled === false && row.userCredentials.disabled === true) {
        return null;
      }
      //Filters done, display records
      return (
        <TableRow key={row.id} selectable={false}>
          <TableRowColumn>{row.displayName}</TableRowColumn>
          <TableRowColumn>{row.userCredentials.username}</TableRowColumn>
          <TableRowColumn>{row.email}</TableRowColumn>
          <TableRowColumn>
            <IconButton id={row.id} tooltip={(row.userCredentials.disabled === false) ? "Disable" : "Enable"}
              onTouchTap={this.handleDisableUser.bind(this, row)}>
              {(row.userCredentials.disabled === false) ?
                <FontIcon color='#00ff00' className="material-icons">radio_button_checked</FontIcon> :
                <FontIcon color='#FF0000' className="material-icons">radio_button_checked</FontIcon>

              }
            </IconButton>
          </TableRowColumn>
          <TableRowColumn>{row.userCredentials.lastLogin.substring(0, 10)}</TableRowColumn>
        </TableRow>
      )
    });

    return (
      <div className="wrapper">
        <Paper className='paper' style={{ 'minWidth': '60%' }}>
          <h3 className="subdued title_description">{d2.i18n.getTranslation('app_title_filter')}</h3>

          <div style={{ 'width': '60%', 'float': 'left' }}>
            <CheckboxUI label={d2.i18n.getTranslation("app_lbl_filter_account_disabled")}
              checked={this.state.filterDisabled}
              onCheck={this.handleFilterDisabled}
              labelStyle={{ color: 'grey', fontSize: 'small' }}              
              />
            <CheckboxUI label={d2.i18n.getTranslation("app_lbl_filter_include_child_ou")}
              checked={this.state.searchChildOUs}
              onCheck={this.handleFilterChildOUs}
              disabled={this.state.filterBy != 'ou' || this.state.ouRoot.id === this.state.filter}
              labelStyle={{ color: 'grey', fontSize: 'small' }} 
              />

            <FilterBy value={this.state.filterBy}
              onFilterChange={this.handleFilterChange}
              groups={this.state.userGroups}
              ouRoot={this.props.ouRoot}
            />
            {(this.state.processing === true) ? <CircularProgress /> : null}
          </div>
          <div style={{ 'width': '20%', 'float': 'left' }}>
          </div>
          <div style={{ 'width': '30%', 'float': 'left' }}>
            <CheckboxUI label="Filters"
              checked={this.state.filterstatus}
              onCheck={this.handlefilterstatus}
              labelStyle={{ color: 'grey', fontSize: 'small' }} />
            <SelectField value={this.state.type}
              onChange={this.handleTypeChange}
              autoWidth={true}
              disabled={!this.state.filterstatus}
              floatingLabelText={d2.i18n.getTranslation('app_lbl_finduser')}
              maxHeight={100}
              style={{ 'float': 'left' }}>
              <MenuItem value='fresh' key='fresh' label={d2.i18n.getTranslation('app_opt_have')} primaryText={d2.i18n.getTranslation('app_opt_have')} />
              <MenuItem value='stale' key='stale' label={d2.i18n.getTranslation('app_opt_haveNot')} primaryText={d2.i18n.getTranslation('app_opt_haveNot')} />
            </SelectField>

            <div style={{ 'height': '35px' }}></div>
            <div style={{ 'width': '80%', 'float': 'left' }}>
              <span style={{ 'float': 'left', fontSize: 'small', color: 'grey' }}>{d2.i18n.getTranslation('app_lbl_timelogged')}&nbsp;
                      <span style={{ fontSize: 'normal', fontWeight: 'bold', color: 'black' }}> {this.state.days}</span> {d2.i18n.getTranslation('app_lbl_timelogged_day')}</span>
              <Slider
                step={1}
                value={this.state.days}
                defaultValue={30}
                min={1}
                max={180}
                onChange={this.handleLengthChange}
                disabled={!this.state.filterstatus}
                style={{ marginBottom: '0px' }}
              />
            </div>
            <TextField hintText="Name"
              floatingLabelText="With name containing"
              floatingLabelFixed={true}
              value={this.state.filterUsername}
              onChange={this.handleUserChange}
              disabled={!this.state.filterstatus} />
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
                      onClick={this.process}
                      icon={<FontIcon className="material-icons">search</FontIcon>}
                      style={{ 'clear': 'both', 'float': 'left' }}
                    />
                  </td>
                  <td>
                    <RaisedButton
                      label="Clear search"
                      labelPosition="before"
                      primary={true}
                      disabled={this.state.processing}
                      onClick={this.ClearFilters}
                      icon={<FontIcon className="material-icons">settings_backup_restore</FontIcon>}
                      style={{ 'clear': 'both', 'float': 'left' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

          </div>


        </Paper>

        <Paper className="paper" style={{ 'float': 'left', 'clear': 'both' }}>


          <Table selectable={false}>
            <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
              <TableRow selectable={false}>
                <TableHeaderColumn>
                  Name
                      </TableHeaderColumn>
                <TableHeaderColumn>
                  UserName
                      </TableHeaderColumn>
                <TableHeaderColumn>
                  Email
                      </TableHeaderColumn>
                <TableHeaderColumn>
                  Active
                      </TableHeaderColumn>
                <TableHeaderColumn>
                  Last Login
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
            {/* <li>Total Records: {this.state.pager.total}</li> */}
            <li> Loaded: {this.state.data.length} </li>
            <li>errors:{this.state.errors}</li>
          </ul>
        </Paper>

      </div>
    );
  },
});
