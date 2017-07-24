import React from 'react';

import { getInstance } from 'd2/lib/d2';
import OrgUnitTree from 'd2-ui/lib/org-unit-tree/OrgUnitTree.component';


import Paper from 'material-ui/lib/paper';
import FontIcon from 'material-ui/lib/font-icon';
import RaisedButton from 'material-ui/lib/raised-button';
import IconButton from 'material-ui/lib/icon-button';
import Snackbar from 'material-ui/lib/snackbar';
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/lib/table';
import CircularProgress from 'material-ui/lib/circular-progress';

import SelectField from 'material-ui/lib/select-field';
import MenuItem from 'material-ui/lib/menus/menu-item';
import Checkbox from 'material-ui/lib/checkbox';
import TextField from 'material-ui/lib/text-field';
import TextFieldLabel from 'material-ui/lib/text-field';
import Slider from 'material-ui/lib/slider';
import { green500, red500 } from 'material-ui/lib/styles/colors';

import FilterBy from './Filter.component.js';

import AppTheme from '../colortheme';
import HelpDialog from './HelpDialog.component';
import actions from '../actions';

const help = {
  help: (
    <div>
      <p>
        This app provides a convenient interface to audit user accounts within your DHIS2 application.
      </p>
      <h1>Listing</h1>
      <p>
        Simple tool to list users with certain audit parameters to facilitate better user management.
      </p>
      <p>
        Features:
      </p>
      <ul style={{ listStyle: 'none' }}>
        <li>Listing users who have logged in the past X days</li>
        <li>Listing users who have not logged in the past X days</li>
      </ul>
      <h3>Note</h3>
      <p>Choosing to <i>Include Child OUs</i> may <b>dramatically</b> slow down your system depending on how high up in the tree you are searching.</p>
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
      type: 'commInt',       // commInt (show comment and interpretation)
      data: [],
      pager: { page: 0, pageCount: 0, pageSize: 0, total: 0 }
    };
  },

  //make sure we have our necessary select box data
  componentDidMount() {
    //dispath the Interprtation search when page is loaded.
    this.process();
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
  },
  //agregate API result  
  aggregateResult(dataValues) {
    var aggregateValue = [];
    var lastdateInterpretation = null;
    var lastdateComment = null;
    dataValues.map((dataValue) => {
      //add Interpretation
      var index = aggregateValue.findIndex(x => (x.user === dataValue.user.id && x.type === "interpretation"));

      try {
        console.log(aggregateValue[0].id);
      } catch (err) {
        console.log("vacio")
      };

      if (index === -1) {
        aggregateValue.push({ "id": dataValue.id, "user": dataValue.user.id, "userName": dataValue.user.name, "created": dataValue.created, "type": "interpretation", "total": 1 });
      }
      else {
        var dateInterpretation = new Date(dataValue.created);
        if (dateInterpretation > lastdateInterpretation) {
          aggregateValue[index] = { "id": dataValue.id, "user": dataValue.user.id, "userName": dataValue.user.name, "created": dataValue.created, "type": "interpretation", "total": aggregateValue[index].total+1 };
          lastdateInterpretation = dateInterpretation;
        }

      }
      dataValue.comments.map((dataValuecomm) => {
        var indexm = aggregateValue.findIndex(x => (x.user === dataValuecomm.user.id && x.type === "comment"));
        if (indexm === -1) {
          aggregateValue.push({ "id": dataValuecomm.id, "user": dataValuecomm.user.id, "userName": dataValuecomm.user.name, "created": dataValuecomm.created, "type": "comment", "total": 1 });
        }
        else {
          var dateComment = new Date(dataValuecomm.created);
          if (dateComment > lastdateComment) {
            aggregateValue[indexm] = { "id": dataValuecomm.id, "user": dataValuecomm.user.id, "userName": dataValuecomm.user.name, "created": dataValuecomm.created, "type": "comment", "total": aggregateValue[indexm].total+1 };
          }
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
      fields: 'id,type,user[name,id],text,created,lastUpdated,text,comments[id,user[name,id],text,created,lastUpdated]'
    };
    api.get('interpretations', search).then(promise => {
      if (promise.hasOwnProperty('interpretations')) {
        var dataValue = this.aggregateResult(promise.interpretations);
        this.setState({
          data: dataValue,
          pager: { total: dataValue.length },
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

      //hide disabled records aqui voy
      if (this.state.type != row.type && this.state.type != "commInt") {
        return null;
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
          <TableRowColumn>{row.created}</TableRowColumn>
          <TableRowColumn><FontIcon className="material-icons">{row.type == "comment" ? "comment" : "assignment"}</FontIcon></TableRowColumn>
          <TableRowColumn>{row.total}</TableRowColumn>
        </TableRow>
      )
    });
    return (
      <div className="wrapper">
        <HelpDialog style={{ float: "right" }} title={"App Help"} content={help.help} />

        <Paper className='paper' style={{ 'minWidth': '50%' }}>
          <h3 className="subdued title_description">{d2.i18n.getTranslation('app_title_filter_Interpretation')}</h3>
          <div style={{ 'width': '30%', 'float': 'left' }}>
            <TextField hintText="Name"
              floatingLabelText="With name containing"
              floatingLabelFixed={true}
              value={this.state.filterUsername}
              onChange={this.handleUserChange} />
          </div>
          <div style={{ 'width': '20%', 'float': 'left' }}>
            <SelectField value={this.state.type}
              onChange={this.handleFilter}
              autoWidth={true}
              disabled={this.state.filterstatus == false}
              floatingLabelText={d2.i18n.getTranslation('app_lbl_finduser')}
              maxHeight={100}
              style={{ 'float': 'left' }}>
              <MenuItem value='commInt' key='commInt' label={d2.i18n.getTranslation('app_opt_commInt')} primaryText={d2.i18n.getTranslation('app_opt_commInt')} />
              <MenuItem value='comment' key='comment' label={d2.i18n.getTranslation('app_opt_comment')} primaryText={d2.i18n.getTranslation('app_opt_comment')} />
              <MenuItem value='interpretation' key='interpretation' label={d2.i18n.getTranslation('app_opt_interpretation')} primaryText={d2.i18n.getTranslation('app_opt_interpretation')} />
            </SelectField>
          </div>
          <div style={{ 'width': '40%', 'float': 'right' }}>
            <div style={{ 'height': '25px' }}></div>
            <table>
              <tbody>
              <tr>
                <td>
                  <RaisedButton
                    label="Clear"
                    labelPosition="before"
                    primary={true}
                    disabled={this.state.processing}
                    onClick={this.ClearFilters}
                    disabled={this.state.filterstatus == false}
                    icon={<FontIcon className="material-icons">settings_backup_restore</FontIcon>}
                    style={{ 'clear': 'both', 'float': 'left' }}
                  />
                </td>
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
              </tr>
               </tbody>
            </table>
          </div>

          <div style={{ 'width': '10%', 'float': 'left' }}>
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
                  Created date
                      </TableHeaderColumn>
                <TableHeaderColumn>
                  Type
                      </TableHeaderColumn>
                <TableHeaderColumn>
                  Number of register
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
