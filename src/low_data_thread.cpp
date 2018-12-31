// -----------------------------------------------------------------------------
//  low_data_thread.cpp
// -----------------------------------------------------------------------------

#include "low_data_thread.h"
#include "LowDataCallback.h"

#include "low_main.h"

// -----------------------------------------------------------------------------
//  low_data_thread_main
// -----------------------------------------------------------------------------

void *low_data_thread_main(void *arg)
{
    low_main_t *low = (low_main_t *) arg;

#if LOW_ESP32_LWIP_SPECIALITIES
    while(true)
    {
#endif /* LOW_ESP32_LWIP_SPECIALITIES */

    mtx_lock(&low->data_thread_mutex);
    while (true)
    {
start:
        if (low->destroying)
        {
            break;
        }

        for (int priority = 0; priority < 2; priority++)
        {
            if (low->data_callback_first[priority] && !low->destroying)
            {
                LowDataCallback *callback = low->data_callback_first[priority];

                low->data_callback_first[priority] = callback->mNext;
                if (!low->data_callback_first[priority])
                {
                    low->data_callback_last[priority] = NULL;
                }
                callback->mNext = NULL;

                mtx_unlock(&low->data_thread_mutex);

                if (!callback->OnData())
                {
                    mtx_lock(&low->data_thread_mutex);
                    low->data_thread_done = true;
                    cnd_broadcast(&low->data_thread_done_cond);
                    mtx_unlock(&low->data_thread_mutex);

                    delete callback;
                }

                mtx_lock(&low->data_thread_mutex);
                low->data_thread_done = false;
                goto start;
            }
        }
        if (low->destroying)
        {
            break;
        }

        low->data_thread_done = true;
        cnd_broadcast(&low->data_thread_done_cond);

        cnd_wait(&low->data_thread_cond, &low->data_thread_mutex);
        low->data_thread_done = false;
    }
    low->data_thread_done = true;
    cnd_broadcast(&low->data_thread_done_cond);

#if LOW_ESP32_LWIP_SPECIALITIES
    while(low->destroying)
        cnd_wait(&low->data_thread_cond, &low->data_thread_mutex);
    mtx_unlock(&low->data_thread_mutex);
}
#endif /* LOW_ESP32_LWIP_SPECIALITIES */

    mtx_unlock(&low->data_thread_mutex);
    return NULL;
}

// -----------------------------------------------------------------------------
//  low_data_set_callback
// -----------------------------------------------------------------------------

void low_data_set_callback(low_main_t *low, LowDataCallback *callback, int priority)
{
    mtx_lock(&low->data_thread_mutex);
    if (callback->mNext || low->data_callback_last[0] == callback || low->data_callback_last[1] == callback)
    {
        mtx_unlock(&low->data_thread_mutex);
        return;
    }

    if (low->data_callback_last[priority])
    {
        low->data_callback_last[priority]->mNext = callback;
    }
    else
    {
        low->data_callback_first[priority] = callback;
    }
    low->data_callback_last[priority] = callback;

    cnd_broadcast(&low->data_thread_cond);
    mtx_unlock(&low->data_thread_mutex);
}

// -----------------------------------------------------------------------------
//  low_data_clear_callback
// -----------------------------------------------------------------------------

void low_data_clear_callback(low_main_t *low, LowDataCallback *callback)
{
    mtx_lock(&low->data_thread_mutex);
    if (low->data_callback_first[0] == callback)
    {
        LowDataCallback *elem = low->data_callback_first[0];
        low->data_callback_first[0] = elem->mNext;
        if (!low->data_callback_first[0])
        {
            low->data_callback_last[0] = NULL;
        }
    }
    else if (low->data_callback_first[1] == callback)
    {
        LowDataCallback *elem = low->data_callback_first[1];
        low->data_callback_first[1] = elem->mNext;
        if (!low->data_callback_first[1])
        {
            low->data_callback_last[1] = NULL;
        }
    }
    else if (callback->mNext || low->data_callback_last[0] == callback || low->data_callback_last[1] == callback)
    {
        for (int priority = 0; priority < 2; priority++)
        {
            LowDataCallback *elem = low->data_callback_first[priority];
            while (elem && elem->mNext != callback)
            {
                elem = elem->mNext;
            }
            if (!elem)
            {
                continue;
            }

            if (low->data_callback_last[priority] == callback)
            {
                low->data_callback_last[priority] = elem;
                elem->mNext = NULL;
            }
            else
            {
                elem->mNext = callback->mNext;
            }
        }
    }
    callback->mNext = NULL;

    while (!low->data_thread_done)
    {
        cnd_wait(&low->data_thread_done_cond, &low->data_thread_mutex);
    }
    mtx_unlock(&low->data_thread_mutex);
}
