importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.4/pyc/pyodide.js");

function sendPatch(patch, buffers, msg_id) {
  self.postMessage({
    type: 'patch',
    patch: patch,
    buffers: buffers
  })
}

async function startApplication() {
  console.log("Loading pyodide!");
  self.postMessage({type: 'status', msg: 'Loading pyodide'})
  self.pyodide = await loadPyodide();
  self.pyodide.globals.set("sendPatch", sendPatch);
  console.log("Loaded!");
  await self.pyodide.loadPackage("micropip");
  const env_spec = ['https://cdn.holoviz.org/panel/1.2.3/dist/wheels/bokeh-3.2.2-py3-none-any.whl', 'https://cdn.holoviz.org/panel/1.2.3/dist/wheels/panel-1.2.3-py3-none-any.whl', 'pyodide-http==0.2.1', 'altair', 'vega-datasets', 'hvplot', 'matplotlib', 'plotly']
  for (const pkg of env_spec) {
    let pkg_name;
    if (pkg.endsWith('.whl')) {
      pkg_name = pkg.split('/').slice(-1)[0].split('-')[0]
    } else {
      pkg_name = pkg
    }
    self.postMessage({type: 'status', msg: `Installing ${pkg_name}`})
    try {
      await self.pyodide.runPythonAsync(`
        import micropip
        await micropip.install('${pkg}');
      `);
    } catch(e) {
      console.log(e)
      self.postMessage({
	type: 'status',
	msg: `Error while installing ${pkg_name}`
      });
    }
  }
  console.log("Packages loaded!");
  self.postMessage({type: 'status', msg: 'Executing code'})
  const code = `
  
import asyncio

from panel.io.pyodide import init_doc, write_doc

init_doc()

import numpy as np

import pandas as pd

import panel as pn



pn.extension('deckgl', 'echarts', 'plotly', 'vega', template='material')

pn.pane.Markdown('\\nThis example demonstrates **how to efficiently render a number of complex components in \`\`Tabs\`\`** by using the \`dynamic\` parameter.\\n\\n').servable()

import altair as alt

from vega_datasets import data



cars = data.cars()



chart = alt.Chart(cars).mark_circle(size=60).encode(

    x='Horsepower',

    y='Miles_per_Gallon',

    color='Origin',

    tooltip=['Name', 'Origin', 'Horsepower', 'Miles_per_Gallon']

).properties(width='container', height='container').interactive()



altair_pane = pn.pane.Vega(chart)



altair_pane

pn.pane.Markdown('\\n').servable()

from math import pi



from bokeh.palettes import Category20c, Category20

from bokeh.plotting import figure

from bokeh.transform import cumsum



x = {

    'United States': 157,

    'United Kingdom': 93,

    'Japan': 89,

    'China': 63,

    'Germany': 44,

    'India': 42,

    'Italy': 40,

    'Australia': 35,

    'Brazil': 32,

    'France': 31,

    'Taiwan': 31,

    'Spain': 29

}



data = pd.Series(x).reset_index(name='value').rename(columns={'index':'country'})

data['angle'] = data['value']/data['value'].sum() * 2*pi

data['color'] = Category20c[len(x)]



p = figure(sizing_mode='stretch_both', title="Pie Chart", toolbar_location=None,

           tools="hover", tooltips="@country: @value", x_range=(-0.5, 1.0), min_height=800)



r = p.wedge(x=0, y=1, radius=0.4,

        start_angle=cumsum('angle', include_zero=True), end_angle=cumsum('angle'),

        line_color="white", fill_color='color', legend_field='country', source=data)



p.axis.axis_label=None

p.axis.visible=False

p.grid.grid_line_color = None



bokeh_pane = pn.pane.Bokeh(p, sizing_mode="stretch_both", max_width=1300)



bokeh_pane

pn.pane.Markdown('\\n').servable()

MAPBOX_KEY = (

    "pk.eyJ1IjoibWFyY3Nrb3ZtYWRzZW4iLCJhIjoiY2s1anMzcG5rMDYzazNvcm10NTFybTE4cSJ9."

    "TV1XBgaMfR-iTLvAXM_Iew"

)



json_spec = {

    "initialViewState": {

        "bearing": -27.36,

        "latitude": 52.2323,

        "longitude": -1.415,

        "maxZoom": 15,

        "minZoom": 5,

        "pitch": 40.5,

        "zoom": 6

    },

    "layers": [{

        "@@type": "HexagonLayer",

        "autoHighlight": True,

        "coverage": 1,

        "data": "https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv",

        "elevationRange": [0, 3000],

        "elevationScale": 50,

        "extruded": True,

        "getPosition": "@@=[lng, lat]",

        "id": "8a553b25-ef3a-489c-bbe2-e102d18a3211", "pickable": True

    }],

    "mapStyle": "mapbox://styles/mapbox/dark-v9",

    "views": [{"@@type": "MapView", "controller": True}]

}



deck_gl = pn.pane.DeckGL(json_spec, mapbox_api_key=MAPBOX_KEY, sizing_mode='stretch_both')



deck_gl

pn.pane.Markdown('\\n').servable()

echart = {

        'title': {

            'text': 'ECharts entry example'

        },

        'tooltip': {},

        'legend': {

            'data':['Sales']

        },

        'xAxis': {

            'data': ["shirt","cardign","chiffon shirt","pants","heels","socks"]

        },

        'yAxis': {},

        'series': [{

            'name': 'Sales',

            'type': 'bar',

            'data': [5, 20, 36, 10, 10, 20]

        }],

    }



echarts_pane = pn.pane.ECharts(echart, sizing_mode='stretch_both')



echarts_pane

pn.pane.Markdown('\\n').servable()

import holoviews as hv

import hvplot.pandas

import holoviews.plotting.bokeh



def sine(frequency=1.0, amplitude=1.0, function='sin'):

    xs = np.arange(200)/200*20.0

    ys = amplitude*getattr(np, function)(frequency*xs)

    return pd.DataFrame(dict(y=ys), index=xs).hvplot(responsive=True)



dmap = hv.DynamicMap(sine, kdims=['frequency', 'amplitude', 'function']).redim.range(

    frequency=(0.1, 10), amplitude=(1, 10)).redim.values(function=['sin', 'cos', 'tan']).opts(responsive=True, line_width=4)



hv_panel = pn.pane.HoloViews(dmap, widgets={

    'amplitude': pn.widgets.LiteralInput(value=1., type=(float, int)),

    'function': pn.widgets.RadioButtonGroup,

    'frequency': {'value': 5},

}, center=True, sizing_mode='stretch_both').layout



hv_panel

pn.pane.Markdown('\\n').servable()

import numpy as np

import matplotlib



matplotlib.use('agg')



import matplotlib.pyplot as plt



Y, X = np.mgrid[-3:3:100j, -3:3:100j]

U = -1 - X**2 + Y

V = 1 + X - Y**2

speed = np.sqrt(U*U + V*V)



fig0, ax0 = plt.subplots()

strm = ax0.streamplot(X, Y, U, V, color=U, linewidth=2, cmap=plt.cm.autumn)

fig0.colorbar(strm.lines)



mpl_pane = pn.pane.Matplotlib(fig0, format='svg', sizing_mode='stretch_both')



mpl_pane

pn.pane.Markdown('\\n').servable()

import plotly.graph_objs as go



xx = np.linspace(-3.5, 3.5, 100)

yy = np.linspace(-3.5, 3.5, 100)

x, y = np.meshgrid(xx, yy)

z = np.exp(-(x-1)**2-y**2)-(x**3+y**4-x/5)*np.exp(-(x**2+y**2))



surface = go.Surface(z=z)

layout = go.Layout(

    title='Plotly 3D Plot',

    autosize=True,

    margin=dict(t=50, b=50, r=50, l=50)

)

fig = dict(data=[surface], layout=layout)



plotly_pane = pn.pane.Plotly(fig)



plotly_pane

pn.pane.Markdown('\\n').servable()

pn.Tabs(

    ('Altair', altair_pane),

    ('Bokeh', bokeh_pane),

    ('deck.GL', deck_gl),

    ('Echarts', echarts_pane),

    ('HoloViews', hv_panel),

    ('Matplotlib', mpl_pane),

    ('Plotly', plotly_pane),

    dynamic=True, sizing_mode='stretch_both'

).servable()

pn.state.template.title = 'Dynamic Tabs'

await write_doc()
  `

  try {
    const [docs_json, render_items, root_ids] = await self.pyodide.runPythonAsync(code)
    self.postMessage({
      type: 'render',
      docs_json: docs_json,
      render_items: render_items,
      root_ids: root_ids
    })
  } catch(e) {
    const traceback = `${e}`
    const tblines = traceback.split('\n')
    self.postMessage({
      type: 'status',
      msg: tblines[tblines.length-2]
    });
    throw e
  }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'rendered') {
    self.pyodide.runPythonAsync(`
    from panel.io.state import state
    from panel.io.pyodide import _link_docs_worker

    _link_docs_worker(state.curdoc, sendPatch, setter='js')
    `)
  } else if (msg.type === 'patch') {
    self.pyodide.globals.set('patch', msg.patch)
    self.pyodide.runPythonAsync(`
    state.curdoc.apply_json_patch(patch.to_py(), setter='js')
    `)
    self.postMessage({type: 'idle'})
  } else if (msg.type === 'location') {
    self.pyodide.globals.set('location', msg.location)
    self.pyodide.runPythonAsync(`
    import json
    from panel.io.state import state
    from panel.util import edit_readonly
    if state.location:
        loc_data = json.loads(location)
        with edit_readonly(state.location):
            state.location.param.update({
                k: v for k, v in loc_data.items() if k in state.location.param
            })
    `)
  }
}

startApplication()