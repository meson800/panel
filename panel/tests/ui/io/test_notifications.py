import pytest

try:
    from playwright.sync_api import expect
    pytestmark = pytest.mark.ui
except ImportError:
    pytestmark = pytest.mark.skip('playwright not available')

from panel.config import config
from panel.io.state import state
from panel.pane import Markdown
from panel.template import BootstrapTemplate
from panel.tests.util import serve_component
from panel.widgets import Button


def test_notifications_no_template(page, port):
    def callback(event):
        state.notifications.error('MyError')

    def app():
        config.notifications = True
        button = Button(name='Display error')
        button.on_click(callback)
        return button

    serve_component(page, port, app)

    page.click('.bk-btn')

    expect(page.locator('.notyf__message')).to_have_text('MyError')


def test_notifications_with_template(page, port):
    def callback(event):
        state.notifications.error('MyError')

    with config.set(notifications=True):
        button = Button(name='Display error')
        button.on_click(callback)
        tmpl = BootstrapTemplate()
        tmpl.main.append(button)

    serve_component(page, port, tmpl)

    page.click('.bk-btn')

    expect(page.locator('.notyf__message')).to_have_text('MyError')


def test_ready_notification(page, port):
    def app():
        config.ready_notification = 'Ready!'
        return Markdown('Ready app')

    serve_component(page, port, app)

    expect(page.locator('.notyf__message')).to_have_text('Ready!')


def test_disconnect_notification(page, port):
    def app():
        config.disconnect_notification = 'Disconnected!'
        button = Button(name='Stop server')
        button.js_on_click(code="""
        Bokeh.documents[0].event_manager.send_event({'event_name': 'connection_lost', 'publish': false})
        """)
        return button

    serve_component(page, port, app)

    page.click('.bk-btn')

    expect(page.locator('.notyf__message')).to_have_text('Disconnected!')
