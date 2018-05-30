import React from 'react';

import FloatingActionButton from 'material-ui/FloatingActionButton';
import FontIcon from 'material-ui/FontIcon';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';

export default React.createClass({
    getInitialState: function() {
      return { open: false };
    },
    handleOpen: function(){
      this.setState({open:true});
    },
    handleClose: function(){
      this.setState({open:false});
    },
    render: function() {
      const actions = [
        <FlatButton label="Close" primary={true} onTouchTap={this.handleClose} />
      ];
      return (
        <div>
          <FloatingActionButton mini={true} onTouchTap={this.handleOpen} secondary={true}>
            <FontIcon className="material-icons">help</FontIcon>
          </FloatingActionButton>
          <Dialog title={this.props.title}
            actions={actions}
            modal={false}
            open={this.state.open}
            onRequestClose={this.handleClose}
            autoScrollBodyContent={true}
            titleClassName="helpDialogTitle"
            contentStyle={{maxWidth: '75%'}}
          >
            {this.props.content}
          </Dialog>
        </div>
      );
    },
});
