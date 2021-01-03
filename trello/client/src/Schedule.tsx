import React, {useState} from 'react';
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list';
import './Schedule.css'

const Schedule = () => {
    const t = window.TrelloPowerUp.iframe();
    const [events, setEvents] = useState<{title: string, start: string}[]>([])
    useState(async () => {
        const cards = await t.cards('id', 'name', 'badges', 'due', 'cover')
        if (cards) {
            console.log(cards)
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
            plugins={[ dayGridPlugin, listPlugin ]}
            initialView={t.arg('initialView')}
            events={events}
            eventClick={(ec) => {
                t.showCard(ec.event.extendedProps.id)
            }}
        />
    )
}
export default Schedule;
