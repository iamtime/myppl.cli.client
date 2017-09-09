	/* 
		MyPPL.ru Cli client
	*/
	var net = require('net');
	var fs = require('fs');
	var io = require('socket.io-client');
	var prompt = require('cli-prompt');
	var replace = require("replace"); 
	
	var log = console.log;
	var errtimer;
	var rigKey = fs.readFileSync('rig.key', 'utf8');
	var rigCheck;
	var rigPass;
	
	console.reset = function () {
	  return process.stdout.write('\033c');
	}
	
	var echo = function(data){
		var date = new Date();
		var mon = ('0'+(1+date.getMonth())).replace(/.?(\d{2})/,'$1')
		var now=date.toString().replace(/^[^\s]+\s([^\s]+)\s([^\s]+)\s([^\s]+)\s([^\s]+)\s.*$/ig,'$2 $4')

		log('['+now+'] '+data+'');
	}
	
	
	
	var Cli_client = function(){
		var self = this;
		var con;

		self.init = function() {
			
			self.con = io.connect( 'http://myppl.ru:8060', { reconnect: true } );
			
			self.con.on('error', function() { 
				echo('error');
			});
			
			self.con.on('connect', function() {
				self.handleConnection(self.con);
			});
			
		}
		
		self.handleConnection = function(c) {
			echo('Connected');
			
			c.emit('getmyip',rigKey);
			
			c.on('yourip', function(data) {
				
				if(data.host.length > 0){
					host = data.host;
					port = data.port;
					rigPass = data.password;
					
					echo('Connecting to rig at '+host+':'+port+'');
					
					getRigData(host,port,true); 
					
				}else{
					echo('Error');
				}
			});
			
			c.on('disconnect', function() {
				echo('<font color="red">Disconnected! Check internet connection!</font>');
				clearTimeout(errtimer);
				c.removeAllListeners();
				
				setTimeout(function(){
					self.init();
				},5000);
			});
			
			c.on('reloadplz', function() {
				echo('Force update.');
				getRigData(host,port);
			});
			
			c.on('err_key', function() {
				prompt.multi([
				  {
					label: 'enter your RIGKey',
					key: 'rigkey',
				  }
				], function(data){
					newkey = data.rigkey.replace(/\W+/g, " ");
					fs.writeFile('rig.key', newkey);
					c.emit('getmyip',newkey);
					rigKey = newkey;
				}, console.error);
			});
			
			c.on('miner_restart', function() {
				restartMiner(host,port);
			});
			
			c.on('miner_reboot', function() {
				rebootMiner(host,port);
			});
		}
		
	}
	console.reset();
	var $client = new Cli_client();
	$client.init();

	
	function getRigData(host,port,firstload){
		
		var $socket = new S();
		
		if(typeof firstload != 'undefined'){
			$socket.setfl(true);
		}else{
			$socket.setfl(false);
		}
		
		$socket.on('connect',function(){
			if($socket.getfl() === true){
				echo('Connected to rig. Send getstat1');
			}
			
			$socket.setstart(true);
			
			$socket.setTimeout(10000);
			
			var req = '{"id":0,"jsonrpc":"2.0","method":"miner_getstat1"';
				req += (rigPass ? ',"psw":"'+rigPass+'"}' : '}');
				
			$socket.write(req + '\n');
		});
		
		$socket.on('data',function(data){
			
			$socket.setstart(false);
			
			var d = JSON.parse(data);
			if($socket.getfl() === true){
				echo('Rig is Online!');
			}
			
			var data = {
				'rig' : rigKey,
				'data' : d,
			};
			
			var date = new Date();
			var mon = ('0'+(1+date.getMonth())).replace(/.?(\d{2})/,'$1')
			var now=date.toString().replace(/^[^\s]+\s([^\s]+)\s([^\s]+)\s([^\s]+)\s([^\s]+)\s.*$/ig,'$2 $4')
			
			$client.con.emit('iamonline',data);
		});
		
		
		$socket.connect(host,port);
			
		clearTimeout(errtimer);
		errtimer = setTimeout(function(){
			getRigData(host,port);
		},60000);
		
	}
	
	
	function restartMiner(host,port){
		
		var $socket = new S();
		
		$socket.on('connect',function(){
			echo('Try to restart <b>'+host+':'+port+'</b>');
			
			$socket.setTimeout(20000);
			var req = '{"id":0,"jsonrpc":"2.0","method":"miner_restart"';
				req += ',"psw":"'+rigPass+'"}';
			
			$socket.write(req + '\n');
			
		});
		
		$socket.on('data',function(data){
			echo('<font color="green">Rig is restarted!</font> Update stats.');
		});
		
		$socket.connect(host,port);
	}
	
	function rebootMiner(host,port){
		
		var $socket = new S();
		
		if(typeof firstload != 'undefined'){
			$socket.setfl(true);
		}else{
			$socket.setfl(false);
		}
		
		$socket.on('connect',function(){
			echo('Try to restart <b>'+host+':'+port+'</b>');
			
			$socket.setTimeout(20000);
			var req = '{"id":0,"jsonrpc":"2.0","method":"miner_reboot"';
				req += ',"psw":"'+rigPass+'"}';
			
			$socket.write(req + '\n');
			
		});
		
		$socket.on('data',function(data){
			echo('<font color="green">Rig is Rebooted!</font> Update stats.');
			clearTimeout(errtimer);
			errtimer = setTimeout(function(){
				getRigData(host,port);
			},60000);
		});
		
		$socket.connect(host,port);
			
		clearTimeout(errtimer);
		errtimer = setTimeout(function(){
			getRigData(host,port);
		},60000);
		
	}
	
	function S() {
		this.socket = new net.Socket();
		this.socket.setTimeout(5000);
		this.startsend = false;
		this.firstload = true;
	};

	S.prototype.connect = function (host,port) {
		
		var st = this;
		
		this.socket.on('timeout', function() {
			echo('<font color="red">Connect to rig TIMEOUT error</font> repeat at 60 sec');			
			
			var data = {
				'rig' : rigKey
			};
			
			$client.con.emit('iamoffline',data);
		});
		
		this.socket.on('end', function(e) {
			
		});
		
		this.socket.on('close', function(e,b) {
			if(st.getstart() === true){
				echo('Failed to get data from miner! Check rig or pwd');
			}
		});

		this.socket.on('error', function(e) {
			this.startsend = false;
			var data = {
				'rig' : rigKey
			};
			$client.con.emit('iamoffline',data);
			echo('socket error: ' + e.message + ' repeat at 60 sec');
		});
		
		this.socket.connect(port, host);
	};

	S.prototype.setstart = function ($data) {
		this.startsend = $data;
	};
	S.prototype.getstart = function () {
		return this.startsend;
	};
	S.prototype.setfl = function ($data) {
		this.firstload = $data;
	};
	S.prototype.getfl = function () {
		return this.firstload;
	};
	S.prototype.setTimeout = function ($data) {
		this.socket.setTimeout($data);
	};
	S.prototype.write = function ($data) {
		this.socket.write($data);
	};
	S.prototype.on = function ($ev,$data) {
		this.socket.on($ev, $data);
	};