import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import * as serviceWorker from './serviceWorker';
import Chart from "react-google-charts";
import io from 'socket.io-client';
import $ from 'jquery';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie
} from 'recharts';
import {
  max, min, random, round
} from 'mathjs'

const socket = io('wss://le-18262636.bitzonte.com', {
  path: '/stocks'
});

var tickerdict = {};

$('#connect_button').on('click', function(){
  socket.connect();
  console.log('connect');
  ReactDOM.render(<h2>Connected</h2>, document.getElementById('connection'));
});

$('#disconnect_button').on('click', function(){
  socket.disconnect();
  console.log('disconect');
  ReactDOM.render(<h2>Disconnected</h2>, document.getElementById('connection'));
});

const Stocks = ({}) => {
  const [updates, setUpdates] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [buys, setBuys] = useState([]);
  const [sells, setSells] = useState([]);
  const [volumen_total, setVolumen] = useState(0);

  useEffect(() =>{
    // ESCUCHANDO
    socket.on('UPDATE', update => {
      var date = new Date(update.time*1000);
      setUpdates(currentData => [...currentData, {"ticker": update.ticker, "time": date, "value": update.value }]);
    });
    socket.on('BUY', buy =>{
      var date = new Date(buy.time*1000);
      setBuys(currentData => [...currentData, {"ticker": buy.ticker, "time": date, "volume": buy.volume }]);
      //console.log(buy.volume);
      setVolumen(volumen_total => volumen_total + buy.volume);
    })
    socket.on('SELL', sell =>{
      var date = new Date(sell.time*1000);
      setSells(currentData => [...currentData, {"ticker": sell.ticker, "time": date, "volume": sell.volume }]);
      //console.log(sell.volume);
      setVolumen(volumen_total => volumen_total + sell.volume);
    })
    //EMITO, LUEGO ESCUCHO
    socket.emit('STOCKS');
    socket.on('STOCKS', data => {
      setStocks(currentData => data);
      for(var d in data)
      {
        tickerdict[data[d].company_name] = data[d].ticker;
      }
      //console.log(tickerdict);
    });
    socket.emit('EXCHANGES');
    socket.on('EXCHANGES', data => {
      setExchanges(currentData => data);
    });
  }, []);

  var table = [];
  var pie_chart = [];
  //console.log(buys);
  //console.log(sells);

  for(var ex in exchanges)
  {
    var volumen_compra = 0;
    var volumen_venta = 0;
    var acciones = [];
    var exchange = exchanges[ex];
    //console.log(exchange);
    acciones = exchange.listed_companies;
    //console.log(acciones);
    for(var accion in acciones)
    {
      //console.log(tickerdict);
      var ticker = tickerdict[acciones[accion]];
      //console.log(ticker);
      var buys_ticker = buys.filter(b => b.ticker === ticker);
      //console.log(buys_ticker);
      var sells_ticker = sells.filter(s => s.ticker === ticker);
      for (var buy in buys_ticker)
      {
        //console.log(buys[buy].volume);
        volumen_compra += buys_ticker[buy].volume;
      };
      for (var sell in sells_ticker)
      {
        volumen_venta += sells_ticker[sell].volume;
      };
    };
    if(volumen_total > 0)
    {
      //pie_chart[exchange.name] = (volumen_compra + volumen_venta)/volumen_total;
      pie_chart.push({"name": exchange.name, "value": round(((volumen_compra + volumen_venta)/volumen_total)*100)});
    }
    table.push(<tr>
    <td>{exchange.name}</td>
    <td>{volumen_compra}</td>
    <td>{volumen_venta}</td>
    <td>{volumen_compra+volumen_venta}</td>
    <td>{acciones.length}</td>
    <td>{round(((volumen_compra + volumen_venta)/volumen_total)*100)}</td>
  </tr>)

  };


  var graphs = [];
  for(var empresa in stocks)
  {
    var elem = stocks[empresa];
    //console.log(elem);
    var maximo_historico;
    var minimo_historico;
    var ultimo_valor;
    var penultimo_valor;
    var var_porcentual;
    var volumen_total_ticker = 0;
    var prices = updates.filter(update => update.ticker === elem.ticker);
    var valores_totales = prices.map(function(p){ return p.value } );
    if(valores_totales.length !== 0)
    {
      maximo_historico = max(valores_totales);
      minimo_historico = min(valores_totales);
      ultimo_valor = valores_totales[valores_totales.length - 1];
      if(valores_totales.length > 1)
      {
        penultimo_valor = valores_totales[valores_totales.length - 2];
        var_porcentual = (ultimo_valor-penultimo_valor)/penultimo_valor*100;
      }
    }
    var ticker_buys = buys.filter(buy => buy.ticker === elem.ticker).map(function(p){ return p.volume } );
    var ticker_sells = sells.filter(sell => sell.ticker === elem.ticker).map(function(p){ return p.volume } );
    for(var buy in buys)
    {
      volumen_total_ticker += buys[buy].volume;
    }
    for(var sell in sells)
    {
      volumen_total_ticker += sells[sell].volume;
    }

    //console.log(elem.ticker);
    graphs.push(<div>
    <h2>Empresa: {elem.company_name}</h2>
    <h3>Moneda: {elem.quote_base}</h3>
    <h3>País: {elem.country}</h3>
    <p>Volumen total: {volumen_total_ticker}</p>
    <p>Valor máximo: {maximo_historico}</p>
    <p>Valor mínimo: {minimo_historico}</p>
    <p>Último precio: {ultimo_valor}</p>
    <p>Variación porcentual: {var_porcentual}%</p>
    <LineChart
      width={1000}
      height={300}
      data={prices}
      margin={{
        top: 5, right: 30, left: 20, bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" />
      <YAxis label={elem.quote_base}/>
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="value" label="Valor acción" stroke="#82ca9d" />
    </LineChart>
    </div>);
  };
  return(
    <div>
      <h1>Mercado de valores</h1>
      <table>
      <tr>
        <th>Nombre</th>
        <th>Volumen de compra</th>
        <th>Volumen de venta</th>
        <th>Volumen total</th>
        <th>Número de acciones</th>
        <th>Porcentaje de Mercado</th>
      </tr>
      {table}
      </table>
      <h1>Porcentajes de mercado</h1>
      <p>Total mercado:{volumen_total}</p>
      <PieChart width={400} height={400}>
        <Pie dataKey="value" isAnimationActive={false} data={pie_chart} cx={200} cy={200} outerRadius={80} fill="#8884d8" label/>
        <Tooltip />
      </PieChart>
      <h1>Precio acciones</h1>
      {graphs}
    </div>
  );
};

ReactDOM.render(<Stocks />, document.getElementById('root'));



// function tick() {
//   const element = (
//     <div style={{ display: 'flex', maxWidth: 900 }}>
//   <Chart
//     width={400}
//     height={300}
//     chartType="ColumnChart"
//     loader={<div>Loading Chart</div>}
//     data={[
//       ['City', '2010 Population', '2000 Population'],
//       ['New York City, NY', 8175000, 8008000],
//       ['Los Angeles, CA', 3792000, 3694000],
//       ['Chicago, IL', 2695000, 2896000],
//       ['Houston, TX', 2099000, 1953000],
//       ['Philadelphia, PA', 1526000, 1517000],
//     ]}
//     options={{
//       title: 'Population of Largest U.S. Cities',
//       chartArea: { width: '30%' },
//       hAxis: {
//         title: 'Total Population',
//         minValue: 0,
//       },
//       vAxis: {
//         title: 'City',
//       },
//     }}
//     legendToggle
//   />
//   <Chart
//     width={400}
//     height={'300px'}
//     chartType="AreaChart"
//     loader={<div>Loading Chart</div>}
//     data={[
//       ['Year', 'Sales', 'Expenses'],
//       ['2013', 1000, 400],
//       ['2014', 1170, 460],
//       ['2015', 660, 1120],
//       ['2016', 1030, 540],
//     ]}
//     options={{
//       title: 'Company Performance',
//       hAxis: { title: 'Year', titleTextStyle: { color: '#333' } },
//       vAxis: { minValue: 0 },
//       // For the legend to fit, we make the chart area smaller
//       chartArea: { width: '50%', height: '70%' },
//       // lineWidth: 25
//     }}
//   />
// </div>
//   );
//   ReactDOM.render(element, document.getElementById('root'));
// }
//
// setInterval(tick, 1000);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
