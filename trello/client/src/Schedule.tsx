import React, {useState} from 'react';
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import getToken from './RestApi'
import './Schedule.css'


const Schedule = () => {
    const t = window.TrelloPowerUp.iframe({
        appName: process.env.REACT_APP_TRELLO_APP_NAME,
        appKey: process.env.REACT_APP_TRELLO_APP_KEY,
    });
    const [events, setEvents] = useState<{title: string, start: string}[]>([])
    useState(async () => {
        const cards = await t.cards('id', 'name', 'badges', 'due', 'cover')
        if (cards) {
            setEvents(cards.filter((c) => !!c.due).map((c) => {
                return {
                    title: c.name || '',
                    start: (c.due || '').substr(0, 10),
                    end: (c.due || '').substr(0, 10),
                    allDay: true,
                    extendedProps: { id: c.id },
                }
            }))
        }
    })
    return (
        <FullCalendar
            plugins={[ dayGridPlugin, listPlugin, interactionPlugin ]}
            initialView={t.arg('initialView')}
            events={events}
            editable={true}
            eventClick={(ec) => {
                t.showCard(ec.event.extendedProps.id)
            }}
            eventDrop={async (ed) => {
                if (!ed || !ed.event || !ed.event.start) {
                    return;
                }
                const id = ed.event.extendedProps.id
                const date = ed.event.start.toISOString()
                window.Trello.setToken(await getToken())
                window.Trello.put(`/cards/${id}`, {due: date})
            }}
        />
    )
}
export default Schedule;
